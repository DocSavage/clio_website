// eslint-disable-next-line object-curly-newline
import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { Router, Route } from 'react-router-dom';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';
import { createBrowserHistory } from 'history';
import PropTypes from 'prop-types';
import { ErrorBoundary } from 'react-error-boundary';

import { ThemeProvider } from '@material-ui/styles';
import { createMuiTheme } from '@material-ui/core/styles';

import Navbar from './Navbar';
import Alerts from './Alerts';
import UnauthenticatedApp from './UnauthenticatedApp';
// import loadScript from './utils/load-script';
// import removeScript from './utils/remove-script';
import { loginDSGUser } from './actions/user';
import config from './config';
import { expandDatasets } from './utils/config';
import { addAlert } from './actions/alerts';

import './App.css';

const history = createBrowserHistory();

const Home = lazy(() => import('./Home'));
const Settings = lazy(() => import('./Settings'));
const UserAdmin = lazy(() => import('./UserAdmin'));
const WorkSpaces = lazy(() => import('./WorkSpaces'));
const AuthTest = lazy(() => import('./AuthTest'));
const Help = lazy(() => import('./Help'));
const Docs = lazy(() => import('./Docs'));

const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#739574',
    },
  },
  typography: {
    fontSize: 11,
  },
  props: {
    MuiButton: {
      size: 'small',
    },
    MuiFilledInput: {
      margin: 'dense',
    },
    MuiFormControl: {
      margin: 'none',
    },
    MuiFormHelperText: {
      margin: 'dense',
    },
    MuiIconButton: {
      size: 'small',
    },
    MuiInputBase: {
      margin: 'dense',
    },
    MuiInputLabel: {
      margin: 'dense',
    },
    MuiListItem: {
      dense: true,
    },
    MuiOutlinedInput: {
      margin: 'dense',
    },
    MuiFab: {
      size: 'small',
    },
    MuiTable: {
      size: 'small',
    },
    MuiTextField: {
      margin: 'dense',
    },
    MuiToolbar: {
      variant: 'dense',
    },
  },
  overrides: {
    MuiIconButton: {
      sizeSmall: {
        // Adjust spacing to reach minimal touch target hitbox
        marginLeft: 4,
        marginRight: 4,
        padding: 6,
      },
    },
    MuiTooltip: {
      tooltip: {
        fontSize: 12,
      },
    },
    MuiPagination: {
      root: {
        display: 'inline-block',
      },
    },
  },
});

function ErrorFallback(props) {
  const { error } = props;
  return (
    <div role="alert">
      <p>
        Clio has produced an internal error. Please send the following error information to the
        FlyEM software team.
      </p>
      <pre>{error.stack}</pre>
    </div>
  );
}

ErrorFallback.propTypes = {
  error: PropTypes.object.isRequired,
};

function App() {
  const dispatch = useDispatch();

  const user = useSelector((state) => state.user.get('googleUser'), shallowEqual);
  const projectUrl = useSelector((state) => state.clio.get('projectUrl'), shallowEqual);
  const [datasets, setDatasets] = useState([]);

  // Initialize dataset from URL params or localStorage
  const getInitialDataset = useCallback(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlDataset = searchParams.get('dataset');
    const storedDataset = localStorage.getItem('dataset');
    return urlDataset || (storedDataset ? JSON.parse(storedDataset) : null);
  }, []);

  const [selectedDatasetName, setSelectedDatasetNameState] = useState(getInitialDataset);

  // Update URL and localStorage when dataset changes
  const setSelectedDataset = useCallback((datasetName) => {
    setSelectedDatasetNameState(datasetName);

    // Update URL
    const searchParams = new URLSearchParams(window.location.search);
    if (datasetName) {
      searchParams.set('dataset', datasetName);
    } else {
      searchParams.delete('dataset');
    }
    const newUrl = searchParams.toString()
      ? `${window.location.pathname}?${searchParams.toString()}`
      : window.location.pathname;
    history.replace(newUrl);

    // Update localStorage for backward compatibility
    localStorage.setItem('dataset', JSON.stringify(datasetName));
  }, []);

  // Sync dataset from URL on history change
  useEffect(() => {
    const unlisten = history.listen(() => {
      const searchParams = new URLSearchParams(window.location.search);
      const urlDataset = searchParams.get('dataset');
      if (urlDataset !== selectedDatasetName) {
        setSelectedDatasetNameState(urlDataset);
        if (urlDataset) {
          localStorage.setItem('dataset', JSON.stringify(urlDataset));
        }
      }
    });
    return unlisten;
  }, [selectedDatasetName]);

  // This effect will fire off a request to the production clio store to let us know when
  // a client is using a non standard production or test url. This should be a very rare
  // case, but we want to know when it happens to check and see what the url was.
  useEffect(() => {
    if (process.env.REACT_APP_REPORTS) {
      const defaultProd = `${config.projectBaseUrlDefault}/${config.top_level_function}`;
      const defaultTest = `${config.projectBaseUrlTest}/${config.top_level_function}`;
      if (!(defaultProd === projectUrl || defaultTest === projectUrl)) {
        if (user) {
          const data = {
            projectUrl,
            defaultProd,
            defaultTest,
            user: user.info.email,
          };
          const options = {
            method: 'POST',
            keepalive: 'true',
            headers: {
              Authorization: `Bearer ${user.getAuthResponse().id_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          };

          fetch(`${defaultProd}/site-reports`, options)
            .then((res) => res.json())
            .then((res) => console.log(res));
        }
      }
    }
  }, [projectUrl, user]);

  useEffect(() => {
    if (user) {
      const options = {
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const datasetUrl = `${projectUrl}/datasets`;
      fetch(datasetUrl, options)
        .then((result) => {
          if (!result.ok) {
            // Create a custom error with response info
            return result.text().then((text) => {
              const error = new Error(`Request failed with status ${result.status}`);
              error.status = result.status;
              error.statusText = result.statusText;
              error.body = text;
              throw error;
            });
          }
          return result.json();
        })
        .then((res) => {
          const datasetsArray = expandDatasets(res);
          setDatasets(datasetsArray);
        })
        .catch((err) => {
          console.error('Error fetching datasets:', err);
          dispatch(addAlert({
            severity: 'error',
            message: 'Failed to load datasets from the server. Please logout and log back in. If the error persists, please contact support.',
          }));
        });
    }
  }, [user, dispatch, projectUrl]);

  // Rehydrate the user session from the backend. In DSG mode the dsg_token
  // HttpOnly cookie survives page reloads, so we just ask the backend who we
  // are via /profile. The loginDSGUser thunk installs the Neuroglancer bridge
  // (window.neurohub.clio.auth) with the fresh Bearer token so our neuroglancer
  // fork can authenticate against clio-store.
  useEffect(() => {
    if (!projectUrl) return;
    dispatch(loginDSGUser());
  }, [dispatch, projectUrl]);

  // if not logged in then show the login page for all routes.
  if (!user) {
    return <UnauthenticatedApp history={history} theme={theme} />;
  }
  // The inner ErrorBoundary should catch most errors, and will keep the Navbar with the
  // Neurohub branding.  The outer ErrorBoundary is a last resort, in case there is an
  // error in the Navbar itself.
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Router history={history}>
        <ThemeProvider theme={theme}>
          <Navbar
            history={history}
            datasets={datasets}
            selectedDatasetName={selectedDatasetName}
            setSelectedDataset={setSelectedDataset}
          />
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <div className="App">
              <Suspense fallback={<div>Loading Homepage...</div>}>
                <Route path="/" exact component={Home} />
              </Suspense>
              <Suspense fallback={<div>Loading...</div>}>
                <Route path="/ws/:ws">
                  <WorkSpaces datasets={datasets} selectedDatasetName={selectedDatasetName} />
                </Route>
                <Route path="/settings" component={Settings} />
                <Route path="/help" component={Help} />
                <Route path="/api/docs" component={Docs} />
                <Route path="/users" component={UserAdmin} />
                <Route path="/auth_test" component={AuthTest} />
              </Suspense>
            </div>
            <Alerts />
          </ErrorBoundary>
        </ThemeProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
