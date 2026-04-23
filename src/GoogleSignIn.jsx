/* eslint-disable no-underscore-dangle, camelcase */
import { Button } from '@material-ui/core';
import Avatar from '@material-ui/core/Avatar';
import Tooltip from '@material-ui/core/Tooltip';
import React from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { logoutDSGUser } from './actions/user';
import { authBaseFromProjectUrl } from './utils/auth';

export default function GoogleSignin() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.get('googleUser'), shallowEqual);
  const clioUrl = useSelector((state) => state.clio.get('projectUrl'), shallowEqual);

  const handleLogin = () => {
    const authBase = authBaseFromProjectUrl(clioUrl);
    const redirectUrl = encodeURIComponent(window.location.href);
    window.location.href = `${authBase}/login?redirect=${redirectUrl}`;
  };

  const handleLogout = () => {
    dispatch(logoutDSGUser());
  };

  if (user) {
    return (
      <Tooltip title="logout">
        <Button color="inherit" onClick={handleLogout}>
          {user.info && user.info.picture ? (
            <Avatar alt={user.info.name} src={user.info.picture} />
          ) : (
            <Avatar>
              {(user.info && user.info.email && user.info.email.charAt(0).toUpperCase()) || '?'}
            </Avatar>
          )}
        </Button>
      </Tooltip>
    );
  }

  return (
    <Button variant="contained" color="primary" onClick={handleLogin} id="loginButton">
      LOGIN
    </Button>
  );
}
