import React, { createContext, useState, useEffect, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const [data, setData] = useState({ clients: [], deductions: [] });
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('therapay_settings');
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      token: parsed.token || '',
      gistId: parsed.gistId || '',
      defaultAmount: parsed.defaultAmount || 70
    };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const FILENAME = 'therapay-data.json';

  useEffect(() => {
    if (settings.token && settings.gistId) {
      loadData();
    }
  }, [settings]);

  const cleanGistId = (id) => {
    // If the user pasted a full URL, extract the last part
    if (id.includes('/')) {
        return id.split('/').pop();
    }
    return id;
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const cleanId = cleanGistId(settings.gistId);

    try {
      const response = await fetch(`https://api.github.com/gists/${cleanId}?t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${settings.token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) throw new Error('Gist not found. Check ID.');
        if (response.status === 401) throw new Error('Unauthorized. Check Token.');
        throw new Error(`GitHub API Error: ${response.status}`);
      }

      const gist = await response.json();
      if (gist.files && gist.files[FILENAME]) {
        const content = JSON.parse(gist.files[FILENAME].content);
        // Ensure structure
        if (!content.clients) content.clients = [];
        if (!content.deductions) content.deductions = [];
        setData(content);
      } else {
        // Initialize if file doesn't exist (though usually it should)
        setData({ clients: [], deductions: [] });
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (newData) => {
    // Optimistic update
    setData(newData);

    if (!settings.token || !settings.gistId) return;

    const cleanId = cleanGistId(settings.gistId);

    try {
      await fetch(`https://api.github.com/gists/${cleanId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${settings.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            [FILENAME]: {
              content: JSON.stringify(newData, null, 2),
            },
          },
        }),
      });
    } catch (err) {
      console.error('Failed to save data', err);
      setError('Failed to save data to GitHub.');
    }
  };

  const updateSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('therapay_settings', JSON.stringify(newSettings));
  };

  const addClient = (name) => {
    const newClient = {
      id: uuidv4(),
      name,
      sessions: [],
    };
    const newData = { ...data, clients: [...data.clients, newClient] };
    saveData(newData);
  };

  const addSession = (clientId, sessionData) => {
    const newData = { ...data };
    const clientIndex = newData.clients.findIndex((c) => c.id === clientId);
    if (clientIndex > -1) {
      const newSession = {
        id: uuidv4(),
        ...sessionData,
      };
      // Ensure sessions array exists
      if (!newData.clients[clientIndex].sessions) {
         newData.clients[clientIndex].sessions = [];
      }
      newData.clients[clientIndex].sessions.push(newSession);
      // Sort sessions by date descending
      newData.clients[clientIndex].sessions.sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00'));
      saveData(newData);
    }
  };

  const deleteClient = (clientId) => {
    const newData = {
      ...data,
      clients: data.clients.filter((c) => c.id !== clientId),
    };
    saveData(newData);
  };

  const addDeduction = (deduction) => {
    const newDeduction = { id: uuidv4(), ...deduction };
    const newData = {
      ...data,
      deductions: [...(data.deductions || []), newDeduction].sort(
        (a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00')
      ),
    };
    saveData(newData);
  };

  const deleteDeduction = (deductionId) => {
    const newData = {
      ...data,
      deductions: (data.deductions || []).filter((d) => d.id !== deductionId),
    };
    saveData(newData);
  };

  const deleteSession = (clientId, sessionId) => {
    const newData = { ...data };
    const clientIndex = newData.clients.findIndex((c) => c.id === clientId);
    if (clientIndex > -1) {
      newData.clients[clientIndex].sessions = newData.clients[clientIndex].sessions.filter(
        (s) => s.id !== sessionId
      );
      saveData(newData);
    }
  };

  return (
    <DataContext.Provider
      value={{
        data,
        loading,
        error,
        settings,
        updateSettings,
        addClient,
        addSession,
        deleteClient,
        deleteSession,
        addDeduction,
        deleteDeduction,
        reload: loadData
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
