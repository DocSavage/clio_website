import React from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import Typography from '@material-ui/core/Typography';
import { Link } from 'react-router-dom';
import GlobalSettingsAdmin from './GlobalSettingsAdmin';

export default function Settings() {
  const user = useSelector((state) => state.user.get('googleUser'), shallowEqual);
  const roles = useSelector((state) => state.user.get('roles'), shallowEqual);
  const isAdmin = roles.global_roles && roles.global_roles.includes('admin');

  return (
    <div className="about" style={{ margin: '1em' }}>
      <Typography variant="h5">Settings</Typography>
      {user && (
        <>
          <p>USER: {user.info.name}</p>
          <p>DatasetGateway Token:</p>
          <p>
            <em>
              Never expires — paste into the Authorization: Bearer header for scripted
              API access.
            </em>
          </p>
          <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
            {user.token}
          </pre>
        </>
      )}
      {user && user.info && user.info.dsg_url ? (
        <p>
          DatasetGateway:
          {' '}
          <a
            href={`${user.info.dsg_url}/web/my-account`}
            target="_blank"
            rel="noopener noreferrer"
          >
            User
          </a>
          {isAdmin && (
            <>
              {', '}
              <a
                href={`${user.info.dsg_url}/admin/`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Admin
              </a>
            </>
          )}
        </p>
      ) : (
        isAdmin && <Link to="/users">User Admin</Link>
      )}
      <GlobalSettingsAdmin isAdmin={isAdmin || false} />
    </div>
  );
}
