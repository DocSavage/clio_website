import Immutable from 'immutable';
import C from '../reducers/constants';
import userReducer from '../reducers/user';

// ---------------------------------------------------------------------------
// Reducer tests for DSG auth state transitions
// ---------------------------------------------------------------------------

const initialState = Immutable.Map({
  loggedIn: false,
  userInfo: {},
  token: '',
  googleUser: null,
  roles: {},
  authMethod: null,
  dsgAvailable: false,
});

describe('user reducer — DSG auth state', () => {
  it('sets dsgAvailable on DSG_AVAILABLE', () => {
    const state = userReducer(initialState, { type: C.DSG_AVAILABLE, available: true });
    expect(state.get('dsgAvailable')).toBe(true);
  });

  it('sets authMethod on SET_AUTH_METHOD', () => {
    const state = userReducer(initialState, { type: C.SET_AUTH_METHOD, method: 'dsg' });
    expect(state.get('authMethod')).toBe('dsg');
  });

  it('clears authMethod on LOGOUT_GOOGLE_USER', () => {
    const loggedIn = initialState.set('authMethod', 'dsg').set('googleUser', { token: 'x' });
    const state = userReducer(loggedIn, { type: C.LOGOUT_GOOGLE_USER });
    expect(state.get('authMethod')).toBeNull();
    expect(state.get('googleUser')).toBeNull();
    expect(state.get('roles')).toEqual({});
  });

  it('stores user on LOGIN_GOOGLE_USER (DSG path)', () => {
    const user = { token: 'dsg-tok', info: { email: 'u@test.com', name: 'U', iss: 'dsg' } };
    const state = userReducer(initialState, { type: C.LOGIN_GOOGLE_USER, user });
    expect(state.get('googleUser')).toEqual(user);
  });

  it('merges roles on SET_USER_ROLES', () => {
    const roles = { email: 'u@test.com', global_roles: ['admin'], datasets: { ds1: ['clio_general'] } };
    const state = userReducer(initialState, { type: C.SET_USER_ROLES, roles });
    expect(state.get('roles').email).toBe('u@test.com');
    expect(state.get('roles').global_roles).toEqual(['admin']);
  });
});

// ---------------------------------------------------------------------------
// Action creator tests (using fetch mocks)
// ---------------------------------------------------------------------------

// We need to test checkDsgAuth which is an async thunk.
// Minimal thunk test setup:
import { checkDsgAuth } from './user';

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

describe('checkDsgAuth action', () => {
  const mockState = {
    clio: Immutable.Map({ projectUrl: 'https://backend.test/v2' }),
  };

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  it('returns true and dispatches login on successful profile', async () => {
    const profileData = { email: 'u@test.com', name: 'U', global_roles: [], datasets: {}, groups: [] };
    const tokenData = { token: 'bearer-tok' };

    global.fetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(profileData) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(tokenData) });

    const store = createMockStore(mockState);
    const result = await store.dispatch(checkDsgAuth());

    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://backend.test/profile',
      { credentials: 'include' },
    );
    expect(store.actions).toEqual(
      expect.arrayContaining([
        { type: C.DSG_AVAILABLE, available: true },
        { type: C.LOGIN_GOOGLE_USER, user: expect.objectContaining({ token: 'bearer-tok' }) },
        { type: C.SET_AUTH_METHOD, method: 'dsg' },
        { type: C.SET_USER_ROLES, roles: profileData },
      ]),
    );
  });

  it('returns false and marks DSG unavailable on 404', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const store = createMockStore(mockState);
    const result = await store.dispatch(checkDsgAuth());

    expect(result).toBe(false);
    expect(store.actions).toEqual([{ type: C.DSG_AVAILABLE, available: false }]);
  });

  it('returns false and marks DSG available on 401', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 401 });

    const store = createMockStore(mockState);
    const result = await store.dispatch(checkDsgAuth());

    expect(result).toBe(false);
    expect(store.actions).toEqual([{ type: C.DSG_AVAILABLE, available: true }]);
  });

  it('returns false on network error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('network down'));

    const store = createMockStore(mockState);
    const result = await store.dispatch(checkDsgAuth());

    expect(result).toBe(false);
  });

  it('strips /v2 from projectUrl for auth routes', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const store = createMockStore(mockState);
    await store.dispatch(checkDsgAuth());

    expect(global.fetch).toHaveBeenCalledWith(
      'https://backend.test/profile',
      expect.anything(),
    );
  });
});
