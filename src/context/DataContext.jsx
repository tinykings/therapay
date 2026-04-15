import React, { createContext, useState, useEffect, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

const generateKey = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
};

const deriveKey = async (password) => {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return { key: await crypto.subtle.importKey('raw', bits, 'AES-GCM', false, ['encrypt', 'decrypt']), salt };
};

const encrypt = async (data, key) => {
  const encoder = new TextEncoder();
  const { key: aesKey, salt } = await deriveKey(key);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encoder.encode(JSON.stringify(data))
  );
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);
  return btoa(String.fromCharCode(...combined));
};

const decrypt = async (encryptedBase64, key) => {
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const aesKey = await crypto.subtle.importKey('raw', bits, 'AES-GCM', false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    ciphertext
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
};

export const DataProvider = ({ children }) => {
  const [data, setData] = useState({ clients: [], deductions: [] });
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('therapay_settings');
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      token: parsed.token || '',
      gistId: parsed.gistId || '',
      encryptionKey: parsed.encryptionKey || '',
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
    if (!id) return '';
    if (id.includes('/')) {
        return id.split('/').pop();
    }
    return id;
  };

  const loadData = async () => {
    if (!settings.gistId || !settings.token) {
      return;
    }

    setLoading(true);
    setError(null);
    const cleanId = cleanGistId(settings.gistId);

    try {
      let response;
      try {
        response = await fetch(`https://api.github.com/gists/${cleanId}?t=${Date.now()}`, {
          headers: {
            Authorization: `Bearer ${settings.token}`,
          },
        });
      } catch (networkErr) {
        throw new Error('Network error. Check your connection and token.');
      }

      if (!response.ok) {
        if (response.status === 404) throw new Error('Gist not found. Check ID.');
        if (response.status === 401) throw new Error('Unauthorized. Check Token.');
        throw new Error(`GitHub API Error: ${response.status}`);
      }

      const gist = await response.json();
      if (gist.files && gist.files[FILENAME]) {
        let content;
        const rawContent = gist.files[FILENAME].content;

        if (settings.encryptionKey) {
          try {
            content = await decrypt(rawContent, settings.encryptionKey);
          } catch (e) {
            throw new Error('Decryption failed. Check your encryption key.');
          }
        } else {
          try {
            content = JSON.parse(rawContent);
          } catch (e) {
            throw new Error('Invalid data format in gist.');
          }
        }

        if (!content.clients) content.clients = [];
        if (!content.deductions) content.deductions = [];
        setData(content);
      } else {
        setData({ clients: [], deductions: [] });
      }
    } catch (err) {
      console.error(err);
      const msg = err.message === 'Failed to fetch'
        ? 'Network error. Check your connection and token.'
        : err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (newData) => {
    setData(newData);

    if (!settings.token || !settings.gistId) return;

    const cleanId = cleanGistId(settings.gistId);

    let content;
    if (settings.encryptionKey) {
      content = await encrypt(newData, settings.encryptionKey);
    } else {
      content = JSON.stringify(newData, null, 2);
    }

    try {
      await fetch(`https://api.github.com/gists/${cleanId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${settings.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            [FILENAME]: { content },
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

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `therapay-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (importedData) => {
    const newData = {
      clients: importedData.clients || [],
      deductions: importedData.deductions || [],
    };
    saveData(newData);
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
        exportData,
        importData,
        reload: loadData
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
