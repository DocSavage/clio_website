/* eslint-disable camelcase */
import jwt_decode from 'jwt-decode';
import C from '../reducers/constants';

/**
 * Derive the backend base URL (without /v2 suffix) from the projectUrl.
 * Auth routes (/login, /profile, /logout) live at the top level, not under /v2/.
 */
function authBaseUrl(projectUrl) {
  return projectUrl.replace(/\/v2\/?$/, '');
}

/**
 * Check if the backend supports DSG auth by calling GET /profile with
 * credentials: 'include' (sends the dsg_token HttpOnly cookie).
 *
 * Returns a thunk that resolves to true if DSG login succeeded, false otherwise.
 */
export function checkDsgAuth() {
  return async (dispatch, getState) => {
    const projectUrl = getState().clio.get('projectUrl');
    const baseUrl = authBaseUrl(projectUrl);
    try {
      const profileRes = await fetch(`${baseUrl}/profile`, {
        credentials: 'include',
      });
      if (profileRes.status === 404) {
        // Backend doesn't have DSG routes
        dispatch({ type: C.DSG_AVAILABLE, available: false });
        return false;
      }
      dispatch({ type: C.DSG_AVAILABLE, available: true });
      if (!profileRes.ok) {
        // 401 or other error — DSG routes exist but user not authenticated
        return false;
      }
      const profileData = await profileRes.json();

      // Fetch a Bearer token for API calls
      const tokenRes = await fetch(`${projectUrl}/server/token`, {
        method: 'post',
        credentials: 'include',
      });
      let token = null;
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        token = typeof tokenData === 'string' ? tokenData : tokenData.token || tokenData;
      }

      const user = {
        token,
        info: {
          email: profileData.email,
          name: profileData.name,
          iss: 'dsg',
        },
      };

      localStorage.setItem('user', JSON.stringify(user));
      dispatch({ type: C.LOGIN_GOOGLE_USER, user });
      dispatch({ type: C.SET_AUTH_METHOD, method: 'dsg' });
      dispatch({ type: C.SET_USER_ROLES, roles: profileData });
      return true;
    } catch (err) {
      console.log('DSG auth check failed:', err);
      return false;
    }
  };
}

/**
 * Navigate to the backend's /login endpoint, which redirects to DSG authorize.
 * After DSG auth, the user is redirected back to the given redirect URL.
 */
export function dsgLogin() {
  return (dispatch, getState) => {
    const projectUrl = getState().clio.get('projectUrl');
    const baseUrl = authBaseUrl(projectUrl);
    const redirect = encodeURIComponent(window.location.href);
    window.location.href = `${baseUrl}/login?redirect=${redirect}`;
  };
}

/**
 * Log out via DSG: POST to /logout (clears dsg_token cookie), then clear local state.
 */
export function dsgLogout() {
  return (dispatch, getState) => {
    const projectUrl = getState().clio.get('projectUrl');
    const baseUrl = authBaseUrl(projectUrl);
    localStorage.removeItem('user');
    dispatch({ type: C.LOGOUT_GOOGLE_USER });
    fetch(`${baseUrl}/logout`, { method: 'POST', credentials: 'include' })
      .finally(() => { window.location.href = '/'; });
  };
}

export default function setUserRoles(user) {
  return (dispatch, getState) => {
    const clioUrl = getState().clio.get('projectUrl');
    const rolesUrl = `${clioUrl}/roles`;
    const options = {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    };
    return fetch(rolesUrl, options)
      .then((response) => response.json())
      .then((res) => dispatch({
        type: C.SET_USER_ROLES,
        roles: res,
      }));
  };
}

function exchangeForFlyEMToken(user, clioUrl) {
  return (dispatch) => {
    // get FlyEM token from clio store and save it to localStorage
    const tokenUrl = `${clioUrl}/server/token`;
    const options = {
      method: 'post',
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    };
    fetch(tokenUrl, options)
      .then((response) => response.json())
      .then((res) => {
        const userDetails = jwt_decode(res);
        const updatedUser = { token: res, info: userDetails };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        dispatch({
          type: 'LOGIN_GOOGLE_USER',
          user: updatedUser,
        });
        dispatch(setUserRoles(updatedUser));
      }).catch((err) => console.log(err));
  };
}

export function loginGoogleUser(user) {
  return (dispatch, getState) => {
    const clioUrl = getState().clio.get('projectUrl');
    if (user.info.iss === 'flyem-clio-store') {
      // token has already been exchanged, so just set it in memory
      dispatch({
        type: 'LOGIN_GOOGLE_USER',
        user,
      });
      dispatch(setUserRoles(user));
    } else {
      dispatch(exchangeForFlyEMToken(user, clioUrl, dispatch));
    }
  };
}
