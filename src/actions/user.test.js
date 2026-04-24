import Immutable from 'immutable';
import C from '../reducers/constants';
import userReducer from '../reducers/user';
import { loginDSGUser } from './user';
import { authBaseFromProjectUrl, normalizeTokenResponse } from '../utils/auth';

const initialState = Immutable.Map({
  loggedIn: false,
  userInfo: {},
  token: '',
  googleUser: null,
  roles: {},
});

function createMockStore(state) {
  const actions = [];
  const dispatch = (action) => {
    if (typeof action === 'function') {
      return action(dispatch, () => state);
    }
    actions.push(action);
    return action;
  };
  return { dispatch, getState: () => state, actions };
}

function jsonResponse(body, overrides = {}) {
  return Object.assign({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  }, overrides);
}

function textResponse(body, overrides = {}) {
  return Object.assign({
    ok: true,
    status: 200,
    text: () => Promise.resolve(body),
  }, overrides);
}

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('user reducer', () => {
  it('stores the current DSG-backed user on LOGIN_GOOGLE_USER', () => {
    const user = { token: 'dsg-token', info: { email: 'u@test.com', name: 'U' } };
    const state = userReducer(initialState, { type: C.LOGIN_GOOGLE_USER, user });

    expect(state.get('googleUser')).toEqual(user);
  });

  it('clears the current user and roles on LOGOUT_GOOGLE_USER', () => {
    const loggedIn = initialState
      .set('googleUser', { token: 'dsg-token' })
      .set('roles', { email: 'u@test.com' });
    const state = userReducer(loggedIn, { type: C.LOGOUT_GOOGLE_USER });

    expect(state.get('googleUser')).toBeNull();
    expect(state.get('roles')).toEqual({});
  });

  it('stores roles on SET_USER_ROLES', () => {
    const roles = {
      email: 'u@test.com',
      global_roles: ['admin'],
      datasets: { ds1: ['clio_general'] },
    };
    const state = userReducer(initialState, { type: C.SET_USER_ROLES, roles });

    expect(state.get('roles')).toEqual(roles);
  });
});

describe('auth helpers', () => {
  it('strips a trailing /v2 from projectUrl for auth routes', () => {
    expect(authBaseFromProjectUrl('https://backend.test/v2')).toBe('https://backend.test');
    expect(authBaseFromProjectUrl('https://backend.test/v2/')).toBe('https://backend.test');
    expect(authBaseFromProjectUrl('https://backend.test')).toBe('https://backend.test');
  });

  it('normalizes token responses from current DSG variants', () => {
    expect(normalizeTokenResponse('token-a')).toBe('token-a');
    expect(normalizeTokenResponse({ token: 'token-b' })).toBe('token-b');
    expect(normalizeTokenResponse({ access_token: 'token-c' })).toBe('token-c');
    expect(normalizeTokenResponse({})).toBe('');
  });
});

describe('loginDSGUser action', () => {
  const mockState = {
    clio: Immutable.Map({ projectUrl: 'https://backend.test/v2' }),
  };

  beforeEach(() => {
    global.fetch = jest.fn();
    localStorage.clear();
    delete window.neurohub;
  });

  afterEach(() => {
    delete global.fetch;
    localStorage.clear();
    delete window.neurohub;
    jest.restoreAllMocks();
  });

  it('loads the profile, fetches a DSG API token, and installs the Neuroglancer bridge', async () => {
    const profile = {
      email: 'u@test.com',
      name: 'U',
      picture: 'https://example.test/u.png',
      dsg_url: 'https://dsg.test',
    };
    const roles = {
      email: 'u@test.com',
      global_roles: [],
      datasets: {},
      groups: [],
    };

    global.fetch
      .mockResolvedValueOnce(jsonResponse(profile))
      .mockResolvedValueOnce(textResponse(JSON.stringify({ token: 'bearer-token' })))
      .mockResolvedValueOnce(jsonResponse(roles));

    const store = createMockStore(mockState);
    const user = await store.dispatch(loginDSGUser());
    await flushPromises();

    expect(user).toEqual({
      token: 'bearer-token',
      info: {
        email: 'u@test.com',
        name: 'U',
        picture: 'https://example.test/u.png',
        dsg_url: 'https://dsg.test',
      },
    });
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'https://backend.test/profile',
      { credentials: 'include' },
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://backend.test/v2/server/token',
      { method: 'POST', credentials: 'include' },
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      'https://backend.test/v2/roles',
      {
        credentials: 'include',
        headers: { Authorization: 'Bearer bearer-token' },
      },
    );
    expect(store.actions).toEqual(expect.arrayContaining([
      { type: C.LOGIN_GOOGLE_USER, user },
      { type: C.SET_USER_ROLES, roles },
    ]));
    expect(JSON.parse(localStorage.getItem('user'))).toEqual(user);
    expect(window.neurohub.clio.auth.getAuthResponse()).toEqual({ id_token: 'bearer-token' });
  });

  it('reuses a cached token for the same profile instead of creating another APIKey', async () => {
    const cachedUser = {
      token: 'cached-token',
      info: {
        email: 'u@test.com',
        name: 'Old Name',
        picture: '',
        dsg_url: null,
      },
    };
    const profile = {
      email: 'u@test.com',
      name: 'New Name',
      picture: 'https://example.test/u.png',
      dsg_url: 'https://dsg.test',
    };
    const roles = {
      email: 'u@test.com',
      global_roles: [],
      datasets: {},
      groups: [],
    };

    localStorage.setItem('user', JSON.stringify(cachedUser));
    global.fetch
      .mockResolvedValueOnce(jsonResponse(profile))
      .mockResolvedValueOnce(jsonResponse(roles));

    const store = createMockStore(mockState);
    const user = await store.dispatch(loginDSGUser());
    await flushPromises();

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://backend.test/v2/roles',
      {
        credentials: 'include',
        headers: { Authorization: 'Bearer cached-token' },
      },
    );
    expect(user.token).toBe('cached-token');
    expect(user.info).toEqual({
      email: 'u@test.com',
      name: 'New Name',
      picture: 'https://example.test/u.png',
      dsg_url: 'https://dsg.test',
    });
    expect(JSON.parse(localStorage.getItem('user'))).toEqual(user);
    expect(window.neurohub.clio.auth.getAuthResponse()).toEqual({ id_token: 'cached-token' });
  });

  it('clears cached user state when /profile does not return an authenticated profile', async () => {
    localStorage.setItem('user', JSON.stringify({ token: 'stale-token' }));
    global.fetch.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 401 }));

    const store = createMockStore(mockState);
    const user = await store.dispatch(loginDSGUser());

    expect(user).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('user')).toBeNull();
    expect(store.actions).toEqual([]);
  });
});
