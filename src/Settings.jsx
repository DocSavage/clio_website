import React, { useState, useEffect } from 'react';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';
import Typography from '@material-ui/core/Typography';
import { Link } from 'react-router-dom';
import GlobalSettingsAdmin from './GlobalSettingsAdmin';
import { addAlert } from './actions/alerts';
import { resetTopLevelUrl } from './actions/clio';

export default function Settings() {
  const [clioToken, setClioToken] = useState();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.get('googleUser'), shallowEqual);
  const roles = useSelector((state) => state.user.get('roles'), shallowEqual);
  const authMethod = useSelector((state) => state.user.get('authMethod'));
  const isAdmin = roles.global_roles && roles.global_roles.includes('admin');
  const clioUrl = useSelector((state) => state.clio.get('projectUrl'), shallowEqual);

  useEffect(() => {
    async function fetchToken(url, options) {
      const response = await fetch(url, options);
      const data = await response.json();

      if (response.ok) {
        setClioToken(data);
      } else {
        console.log(response, data);
        const message = `Server responded with ${response.status} : ${data.detail}`;
        dispatch(addAlert({
          severity: 'error',
          message: `Failed to set Top level Url: ${message}`,
        }));
        dispatch(resetTopLevelUrl());
      }
    }

    if (user && clioUrl) {
      const options = {
        method: 'post',
        credentials: 'include',
        headers: user.token ? { Authorization: `Bearer ${user.token}` } : {},
      };

      const tokenUrl = `${clioUrl}/server/token`;

      fetchToken(tokenUrl, options);
    }
  }, [clioUrl, user, dispatch]);

  return (
    <div className="about" style={{ margin: '1em' }}>
      <Typography variant="h5">Settings</Typography>
      {user && (
        <>
          <p>USER: {user.info?.name || user.info?.email}</p>
          {authMethod !== 'dsg' && user.info?.exp && (
            <>
              <p>Google ID Token: {(new Date(user.info.exp * 1000) <= new Date()) ? '⚠️  expired' : ' ✅ valid' } </p>
              <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                {user.token}
              </pre>
            </>
          )}

          <p>ClioStore Token: </p>
          <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
            {clioToken || 'loading...'}
          </pre>
        </>
      )}
      {isAdmin && (
        <Link to="/users">User Admin</Link>
      )}
      <GlobalSettingsAdmin isAdmin={isAdmin || false} />
    </div>
  );
}
