import React, { useState } from 'react';
import FileUploadApp from './components/FileUploadApp';
import ChatInterface from './components/ChatInterface';
import Navigation from './components/Navigation';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'chat'>('upload');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === 'upload' ? <FileUploadApp /> : <ChatInterface />}
    </div>
  );
};

export default App;
