import Immutable from 'immutable';
import C from './constants';

const userState = Immutable.Map({
  loggedIn: false,
  userInfo: {},
  token: '',
  googleUser: null,
  roles: {},
  authMethod: null, // 'dsg' | 'google' | null
  dsgAvailable: false, // true when backend has DSG routes
});

export default function userReducer(state = userState, action) {
  switch (action.type) {
    case C.LOGIN_USER: {
      return state.set('userInfo', action.userInfo).set('loggedIn', true);
    }
    case C.LOGOUT_USER: {
      return state
        .set('userInfo', {})
        .set('token', '')
        .set('loggedIn', false);
    }
    case C.SET_USER_TOKEN: {
      return state.set('token', action.token);
    }
    case C.SET_USER_ROLES: {
      return state.set('roles', { ...state.roles, ...action.roles });
    }
    case C.LOGIN_GOOGLE_USER: {
      return state.set('googleUser', action.user);
    }
    case C.LOGOUT_GOOGLE_USER: {
      localStorage.removeItem('user');
      return state.set('googleUser', null).set('roles', {}).set('authMethod', null);
    }
    case C.SET_AUTH_METHOD: {
      return state.set('authMethod', action.method);
    }
    case C.DSG_AVAILABLE: {
      return state.set('dsgAvailable', action.available);
    }
    default: {
      return state;
    }
  }
}
