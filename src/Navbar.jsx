import PropTypes from 'prop-types';
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector, shallowEqual } from 'react-redux';
import Select from 'react-select';

import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import SettingsIcon from '@material-ui/icons/Settings';
import PersonIcon from '@material-ui/icons/Person';
import HelpIcon from '@material-ui/icons/Help';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import Tooltip from '@material-ui/core/Tooltip';
import { makeStyles } from '@material-ui/core/styles';
import { useTheme } from '@material-ui/styles';
import config from './config';

import DataSetSelection from './Settings/DataSetSelection';
import GoogleSignIn from './GoogleSignIn';

import './Navbar.css';

const productionUrl = `${config.projectBaseUrlDefault}/${config.top_level_function}`;

const useStyles = makeStyles((theme) => ({
  search: {
    fontFamily: theme.typography.fontFamily,
    width: '15em',
    marginLeft: '2em',
  },
  searchContainer: {
    display: 'flex',
    flexGrow: 1,
  },
  title: {
    color: '#fff',
    textDecoration: 'none',
  },
  floater: {
    position: 'absolute',
    top: '0',
    right: '150px',
    background: theme.palette.primary.main,
    textAlign: 'center',
    borderRadius: '0 0 5px 5px',
    zIndex: 5000,
  },
  navToggle: {
    marginRight: '25px',
    color: 'white',
  },
  root: {
    color: 'white',
    backgroundImage: 'linear-gradient(45deg, #8f871d 25%, #9c381f 25%, #9c381f 50%, #8f871d 50%, #8f871d 75%, #9c381f 75%, #9c381f 100%)',
    backgroundSize: '98.99px 98.99px',
    animation: 'animatedBackground 1000s linear infinite',
  },
}));

// eslint-disable-next-line object-curly-newline
function Navbar({ history, datasets, selectedDatasetName, setSelectedDataset }) {
  const classes = useStyles();
  const theme = useTheme();
  const [isCollapsed, setCollapsed] = useState(false);
  const [selectedWorkspace, setWorkspace] = useState(null);
  const [showDataset, setShowDataset] = useState(false);
  const clioUrl = useSelector((state) => state.clio.get('projectUrl'), shallowEqual);

  const location = useLocation();

  const isTesting = clioUrl !== productionUrl;

  useEffect(() => {
    if (!location.pathname.match(/^\/ws\//)) {
      setWorkspace(null);
    }
    if (location.pathname.match(/annotate|image_search/)) {
      setShowDataset(true);
    } else {
      setShowDataset(false);
    }
  }, [location]);

  const selectStyles = {
    placeholder: () => ({
      color: '#fff',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#fff',
    }),
    menu: (provided) => ({
      ...provided,
      color: '#333',
    }),
    control: (provided) => ({
      ...provided,
      background: theme.palette.primary.main,
      border: '1px solid #fff',
    }),
  };

  Navbar.propTypes = {
    history: PropTypes.object.isRequired,
    datasets: PropTypes.arrayOf(PropTypes.object).isRequired,
    selectedDatasetName: PropTypes.string,
    setSelectedDataset: PropTypes.func.isRequired,
  };

  Navbar.defaultProps = {
    selectedDatasetName: null,
  };

  const workspaceOptions = [
    'annotate',
    'image search',
    'atlas',
    'focused proofreading',
    'orphan link',
    'body review',
  ].map((dataset) => ({
    value: `ws/${dataset.replace(/ /, '_')}`,
    label: dataset,
  }));

  function handleCollapse() {
    setCollapsed(!isCollapsed);
  }

  function handleChange(selected) {
    // redirect to the workspace that was chosen.
    setWorkspace(selected);
    history.push(`/${selected.value}`);
  }

  if (isCollapsed) {
    return (
      <div className={classes.floater}>
        <Tooltip title="Show Navigation">
          <Button onClick={handleCollapse} size="small">
            <ArrowDownwardIcon fontSize="inherit" style={{ color: '#fff' }} />
          </Button>
        </Tooltip>
      </div>
    );
  }

  return (
    <AppBar position="static">
      <Toolbar classes={isTesting ? { root: classes.root } : {}}>
        <Link to="/" className={classes.title}>
          <Typography variant="h6" color="inherit">
            Clio
          </Typography>
        </Link>
        <Link to="/settings" className={classes.title}>
          <Typography variant="h6" color="inherit">
            {isTesting ? 'Testing' : ''}
          </Typography>
        </Link>
        <div className={classes.searchContainer}>
          {datasets && (
            <Select
              className={classes.search}
              styles={selectStyles}
              onChange={handleChange}
              value={selectedWorkspace}
              placeholder="Select a workspace"
              options={workspaceOptions}
            />
          )}
          {datasets && showDataset && (
            <DataSetSelection
              forNav
              datasets={datasets}
              selected={selectedDatasetName}
              onChange={setSelectedDataset}
            />
          )}
        </div>
        <Button onClick={handleCollapse} className={classes.navToggle} size="small">
          Hide Header
        </Button>
        <GoogleSignIn />
        <Tooltip title="Help">
          <IconButton to="/help" component={Link} className={classes.title}>
            <HelpIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Profile">
          <IconButton to="/profile" component={Link} className={classes.title}>
            <PersonIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Settings">
          <IconButton to="/settings" component={Link} className={classes.title}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
