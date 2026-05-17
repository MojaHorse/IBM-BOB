const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../../data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

class StateStore {
  constructor() {
    this.files = {
      approvals: path.join(dataDir, 'approvals.json'),
      conflicts: path.join(dataDir, 'conflicts.json'),
      repoHistory: path.join(dataDir, 'repo-history.json'),
      resolutionLog: path.join(dataDir, 'resolutionLog.json')
    };
  }

  _read(file) {
    if (!fs.existsSync(file)) return [];
    try {
      const data = fs.readFileSync(file, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error(`Error reading ${file}:`, err);
      return [];
    }
  }

  _write(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  }

  getApprovals() { return this._read(this.files.approvals); }
  saveApprovals(data) { this._write(this.files.approvals, data); }

  getResolutionLog() { return this._read(this.files.resolutionLog); }
  saveResolutionLog(data) { this._write(this.files.resolutionLog, data); }
  
  appendLogEntry(entry) {
    const logs = this.getResolutionLog();
    logs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry
    });
    if (logs.length > 100) logs.pop();
    this.saveResolutionLog(logs);
  }
}

module.exports = new StateStore();
