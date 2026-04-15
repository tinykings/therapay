import React, { useState, useRef } from 'react';
import { Form, Button, Alert, Card } from 'react-bootstrap';
import { useData } from '../context/DataContext';

const generateKey = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
};

function Settings() {
  const { settings, updateSettings, error, reload, data, exportData, importData } = useData();
  const [formData, setFormData] = useState(settings);
  const [saveStatus, setSaveStatus] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [showCopyKey, setShowCopyKey] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenerateKey = () => {
    setFormData({ ...formData, encryptionKey: generateKey() });
    setShowCopyKey(true);
  };

  const handleExport = () => {
    exportData();
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result);
        if (imported.clients || imported.deductions) {
          importData(imported);
          setImportStatus('Data imported successfully!');
        } else {
          setImportStatus('Invalid file format.');
        }
      } catch {
        setImportStatus('Failed to parse file.');
      }
      setTimeout(() => setImportStatus(''), 3000);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettings(formData);
    setSaveStatus('Settings saved!');
    setShowCopyKey(false);
    setTimeout(() => setSaveStatus(''), 3000);
    reload();
  };

  return (
    <div>
      <h2 className="mb-4">Settings</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      {saveStatus && <Alert variant="success">{saveStatus}</Alert>}
      
      <Card>
        <Card.Body>
          <Card.Text>
            To use this app, you need a GitHub Personal Access Token and a Gist ID.
            <br />
            1. Create a token with <code>gist</code> scope.
            <br />
            2. Create a Gist with a file named <code>therapay-data.json</code> containing <code>{`{ "clients": [] }`}</code>.
          </Card.Text>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="gistId">
              <Form.Label>Gist ID</Form.Label>
              <Form.Control
                type="text"
                name="gistId"
                value={formData.gistId}
                onChange={handleChange}
                placeholder="e.g. 8f6d..."
                autoComplete="username"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="token">
              <Form.Label>GitHub Personal Access Token</Form.Label>
              <Form.Control
                type="password"
                name="token"
                value={formData.token}
                onChange={handleChange}
                placeholder="ghp_..."
                autoComplete="current-password"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="encryptionKey">
              <Form.Label>Encryption Key (optional)</Form.Label>
              <Form.Control
                type="password"
                name="encryptionKey"
                value={formData.encryptionKey}
                onChange={handleChange}
                placeholder="Leave empty for no encryption"
                autoComplete="new-password"
              />
              <div className="d-flex gap-2 mt-2">
                <Button variant="outline-secondary" size="sm" onClick={handleGenerateKey}>
                  Generate Key
                </Button>
              </div>
              {showCopyKey && formData.encryptionKey && (
                <>
                  <Form.Label className="mt-3">Copy Key</Form.Label>
                  <Form.Control
                    type="text"
                    readOnly
                    value={formData.encryptionKey}
                    onClick={(e) => e.target.select()}
                    style={{ cursor: 'pointer' }}
                  />
                  <Form.Text className="text-muted">
                    Click above to select, then copy. Save this key somewhere safe!
                  </Form.Text>
                </>
              )}
              <Form.Text className="text-muted d-block">
                Leave empty for no encryption. Data cannot be recovered without the key.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3" controlId="defaultAmount">
              <Form.Label>Default Session Amount ($)</Form.Label>
              <Form.Control
                type="number"
                name="defaultAmount"
                value={formData.defaultAmount}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Button variant="primary" type="submit">
              Save Settings
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <Card className="mt-4">
        <Card.Body>
          <Card.Title>Backup & Restore</Card.Title>
          <Card.Text className="text-muted">
            Export your data to a JSON file, or import from a backup.
          </Card.Text>
          {importStatus && <Alert variant={importStatus.includes('success') ? 'success' : 'warning'}>{importStatus}</Alert>}
          <div className="d-flex gap-2">
            <Button variant="outline-primary" onClick={handleExport}>
              Export Data
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              Import Data
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

export default Settings;
