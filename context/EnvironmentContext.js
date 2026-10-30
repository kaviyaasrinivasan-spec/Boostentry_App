import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import { setBaseURL } from '../services/api';

const EnvironmentContext = createContext({});

export const ENV_URLS = {
  PROD: 'https://kssroadways.axioralabs.ai',
  UAT: 'https://uat.boostentryai.com',
};

export const EnvironmentProvider = ({ children }) => {
  const [environment, setEnvironmentState] = useState(null);
  const [loadingEnv, setLoadingEnv] = useState(true);

  useEffect(() => {
    loadEnvironment();
  }, []);

  const loadEnvironment = async () => {
    try {
      const storedEnv = await SecureStore.getItemAsync('app_environment');
      if (storedEnv && ENV_URLS[storedEnv]) {
        setEnvironmentState(storedEnv);
        setBaseURL(ENV_URLS[storedEnv]);
      }
    } catch (e) {
      console.error('Failed to load environment:', e);
    } finally {
      setLoadingEnv(false);
    }
  };

  const setEnvironment = async (env) => {
    try {
      if (ENV_URLS[env]) {
        await SecureStore.setItemAsync('app_environment', env);
        setEnvironmentState(env);
        setBaseURL(ENV_URLS[env]);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to save environment:', e);
      return false;
    }
  };

  const resetEnvironment = async () => {
    await SecureStore.deleteItemAsync('app_environment');
    setEnvironmentState(null);
  };

  return (
    <EnvironmentContext.Provider value={{ environment, loadingEnv, setEnvironment, resetEnvironment, ENV_URLS }}>
      {children}
    </EnvironmentContext.Provider>
  );
};

export const useEnvironment = () => useContext(EnvironmentContext);
