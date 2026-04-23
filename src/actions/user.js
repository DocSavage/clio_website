/* eslint-disable camelcase */
import jwt_decode from 'jwt-decode';
import C from '../reducers/constants';
import { authBaseFromProjectUrl, normalizeTokenResponse } from '../utils/auth';

export default function setUserRoles(user) {
  return (dispatch, getState) => {
    const clioUrl = getState().clio.get('projectUrl');
    const rolesUrl = `${clioUrl}/roles`;
    const options = {
      credentials: 'include',
      headers: user && user.token ? { Authorization: `Bearer ${user.token}` } : {},
    };
    return fetch(rolesUrl, options)
      .then((response) => response.json())
      .then((res) => dispatch({
        type: C.SET_USER_ROLES,
        roles: res,
      }));
  };
}

// The Neuroglancer fork reads window.neurohub.clio.auth.getAuthResponse()
// to fetch the current bearer token when it talks to clio-store.
function installNeurohubBridge(token) {
  window.neurohub = {
    clio: {
      auth: {
        getAuthResponse: () => ({ id_token: token }),
      },
    },
  };
}

function loadCachedUser(profileEmail) {
  try {
    const cached = JSON.parse(localStorage.getItem('user') || 'null');
    if (cached && cached.token && cached.info && cached.info.email === profileEmail) {
      return cached;
    }
  } catch (e) {
    // corrupt payload; fall through and re-fetch
  }
  return null;
}

function buildUserFromProfile(profile, token) {
  return {
    token,
    info: {
      email: profile.email,
      name: profile.name || profile.email,
      picture: profile.picture || '',
      dsg_url: profile.dsg_url || null,
    },
  };
}

function persistAndDispatchUser(user, dispatch) {
  localStorage.setItem('user', JSON.stringify(user));
  installNeurohubBridge(user.token);
  dispatch({ type: C.LOGIN_GOOGLE_USER, user });
  dispatch(setUserRoles(user));
}

// DSG-mode login: confirm the browser's dsg_token cookie is valid by calling
// /profile, then (if we don't already have one cached) request a long-lived
// DSG API token to use as a Bearer elsewhere. DSG issues a fresh APIKey row on
// every /create_token call, so we cache aggressively to avoid flooding its
// database with one-shot tokens.
export function loginDSGUser() {
  return (dispatch, getState) => {
    const clioUrl = getState().clio.get('projectUrl');
    const authBase = authBaseFromProjectUrl(clioUrl);

    return fetch(`${authBase}/profile`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((profile) => {
        if (!profile || !profile.email) {
          localStorage.removeItem('user');
          return null;
        }

        const cached = loadCachedUser(profile.email);
        if (cached) {
          // Keep the token but refresh name/picture in case DSG updated them.
          const refreshed = {
            ...cached,
            info: { ...cached.info, ...buildUserFromProfile(profile, cached.token).info },
          };
          persistAndDispatchUser(refreshed, dispatch);
          return refreshed;
        }

        return fetch(`${clioUrl}/server/token`, {
          method: 'POST',
          credentials: 'include',
        })
          .then((res) => {
            if (!res.ok) throw new Error(`token fetch failed: ${res.status}`);
            return res.text();
          })
          .then((raw) => {
            let token = raw.trim();
            try {
              token = normalizeTokenResponse(JSON.parse(raw)) || token;
            } catch (e) {
              // raw string — keep as-is
            }
            token = token.replace(/^"|"$/g, '');

            const user = buildUserFromProfile(profile, token);
            persistAndDispatchUser(user, dispatch);
            return user;
          });
      })
      .catch((err) => {
        console.warn('DSG auth check failed:', err);
        return null;
      });
  };
}

export function logoutDSGUser() {
  return (dispatch, getState) => {
    const clioUrl = getState().clio.get('projectUrl');
    const authBase = authBaseFromProjectUrl(clioUrl);

    localStorage.removeItem('user');
    dispatch({ type: C.LOGOUT_GOOGLE_USER });

    // Navigate the browser to clio-store /logout, which:
    //   (1) invalidates the DSG APIKey server-side,
    //   (2) clears the dsg_token cookie (Domain=.janelia.org),
    //   (3) 302s back to this page with no cookie → the site renders logged-out.
    const redirect = encodeURIComponent(window.location.origin);
    window.location.href = `${authBase}/logout?redirect=${redirect}`;
  };
}

// --- Legacy Google-Sign-In path (non-DSG clio-store) ---

function exchangeForFlyEMToken(user, clioUrl) {
  return (dispatch) => {
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
          type: C.LOGIN_GOOGLE_USER,
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
      dispatch({
        type: C.LOGIN_GOOGLE_USER,
        user,
      });
      dispatch(setUserRoles(user));
    } else {
      dispatch(exchangeForFlyEMToken(user, clioUrl, dispatch));
    }
  };
}
