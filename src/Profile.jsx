import React from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import Typography from '@material-ui/core/Typography';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Chip from '@material-ui/core/Chip';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  root: {
    margin: theme.spacing(2),
    maxWidth: 800,
  },
  section: {
    marginBottom: theme.spacing(3),
  },
  chip: {
    margin: theme.spacing(0.5),
  },
  roleCell: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.5),
  },
}));

function roleLabel(role) {
  switch (role) {
    case 'clio_general': return 'read';
    case 'clio_write': return 'write';
    case 'dataset_admin': return 'dataset admin';
    default: return role;
  }
}

export default function Profile() {
  const classes = useStyles();
  const user = useSelector((state) => state.user.get('googleUser'), shallowEqual);
  const roles = useSelector((state) => state.user.get('roles'), shallowEqual);

  const globalRoles = roles.global_roles || [];
  const datasetPerms = roles.datasets || {};
  const groups = roles.groups || [];

  let userEmail = 'unknown';
  if (user && user.info && user.info.email) {
    userEmail = user.info.email;
  }
  let userName = 'unknown';
  if (user && user.info && user.info.name) {
    userName = user.info.name;
  }

  return (
    <div className={classes.root}>
      <Typography variant="h5" gutterBottom>Profile</Typography>

      <div className={classes.section}>
        <Typography variant="subtitle2" color="textSecondary">Email</Typography>
        <Typography>{roles.email || userEmail || 'unknown'}</Typography>
      </div>

      {(roles.name || userName) && (
        <div className={classes.section}>
          <Typography variant="subtitle2" color="textSecondary">Name</Typography>
          <Typography>{roles.name || user.info.name}</Typography>
        </div>
      )}

      {roles.org && (
        <div className={classes.section}>
          <Typography variant="subtitle2" color="textSecondary">Organization</Typography>
          <Typography>{roles.org}</Typography>
        </div>
      )}

      <div className={classes.section}>
        <Typography variant="subtitle2" color="textSecondary">Global Roles</Typography>
        {globalRoles.length > 0 ? (
          <div>
            {globalRoles.map((role) => (
              <Chip key={role} label={roleLabel(role)} size="small" className={classes.chip} />
            ))}
          </div>
        ) : (
          <Typography variant="body2" color="textSecondary">none</Typography>
        )}
      </div>

      {groups.length > 0 && (
        <div className={classes.section}>
          <Typography variant="subtitle2" color="textSecondary">Groups</Typography>
          <div>
            {groups.map((group) => (
              <Chip key={group} label={group} size="small" variant="outlined" className={classes.chip} />
            ))}
          </div>
        </div>
      )}

      <div className={classes.section}>
        <Typography variant="subtitle2" color="textSecondary">Dataset Permissions</Typography>
        {Object.keys(datasetPerms).length > 0 ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Dataset</TableCell>
                <TableCell>Roles</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(datasetPerms)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([dataset, dsRoles]) => (
                  <TableRow key={dataset}>
                    <TableCell>{dataset}</TableCell>
                    <TableCell>
                      <div className={classes.roleCell}>
                        {(Array.isArray(dsRoles) ? dsRoles : [...(dsRoles || [])])
                          .map((role) => (
                            <Chip
                              key={role}
                              label={roleLabel(role)}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        ) : (
          <Typography variant="body2" color="textSecondary">
            No dataset-specific permissions. Access is determined by global
            roles and public datasets.
          </Typography>
        )}
      </div>
    </div>
  );
}
