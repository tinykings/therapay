import React, { useState } from 'react';
import { Form, Button, Alert, Card } from 'react-bootstrap';
import { useData } from '../context/DataContext';

function Settings() {
  const { settings, updateSettings, error, reload } = useData();
  const [formData, setFormData] = useState(settings);
  const [saveStatus, setSaveStatus] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettings(formData);
    setSaveStatus('Settings saved!');
    setTimeout(() => setSaveStatus(''), 3000);
    // Trigger a reload to test connection
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
            <Form.Group className="mb-3" controlId="token">
              <Form.Label>GitHub Personal Access Token</Form.Label>
              <Form.Control
                type="password"
                name="token"
                value={formData.token}
                onChange={handleChange}
                placeholder="ghp_..."
                required
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="gistId">
              <Form.Label>Gist ID</Form.Label>
              <Form.Control
                type="text"
                name="gistId"
                value={formData.gistId}
                onChange={handleChange}
                placeholder="e.g. 8f6d..."
                required
              />
            </Form.Group>

            <Button variant="primary" type="submit">
              Save Settings
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}

export default Settings;
