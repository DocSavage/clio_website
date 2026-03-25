import React from 'react';
import PropTypes from 'prop-types';
import { Router } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

import { ThemeProvider } from '@material-ui/styles';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';

import Navbar from './Navbar';
import Home from './Home';
import GoogleSignIn from './GoogleSignIn';
import { dsgLogin } from './actions/user';

const useStyles = makeStyles({
  login: {
    width: '500px',
    margin: '20px auto',
    textAlign: 'center',
    position: 'absolute',
    left: '2em',
    zIndex: 2,
  },
});

export default function UnauthenticatedApp({ history, theme }) {
  const classes = useStyles();
  const dispatch = useDispatch();
  const dsgAvailable = useSelector((state) => state.user.get('dsgAvailable'));

  return (
    <Router history={history}>
      <ThemeProvider theme={theme}>
        <Navbar history={history} />
        <div className="App">
          <Card className={classes.login}>
            <CardContent>
              <Typography variant="h5">Please login to access the site.</Typography>
            </CardContent>
            <CardActions>
              <div style={{ margin: 'auto' }}>
                {dsgAvailable ? (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => dispatch(dsgLogin())}
                  >
                    Login
                  </Button>
                ) : (
                  <GoogleSignIn />
                )}
              </div>
            </CardActions>
          </Card>
          <Home />
        </div>
      </ThemeProvider>
    </Router>
  );
}

UnauthenticatedApp.propTypes = {
  history: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
};
