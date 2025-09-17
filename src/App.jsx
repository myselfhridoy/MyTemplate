import React, { Component } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './Components/Navbar/Navbar';

import Dashboard from './Pages/Dashboard/Dashboard';
import DesmosGraphPage from './Pages/DesmosGraphPage';
import BookContentPage from './Pages/BookContentPage';
import ExamplePage from './Pages/ExamplePage';
import ExampleWithAnswer from './Pages/ExampleWithAnswer';
import FilteredCQPage from './Pages/FilteredCQPage';
import CreativeCQPage from './Pages/CreativeCQPage';
import SelfTestPage from './Pages/SelfTestPage';
import AIAssistantPage from './Pages/AIAssistantPage';
import AIChatPage from './Pages/AIChatPage';
import DoubtSolvePage from './Pages/DoubtSolvePage';
import ToolsPage from './Pages/ToolsPage';


export default class App extends Component {
  render() {
    return (
      <>
        <Navbar />
        <div className="pt-16 min-h-screen">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/example" element={<ExamplePage />} />
            <Route path="/example-with-answer" element={<ExampleWithAnswer />} />
            <Route path="/cq-filter" element={<FilteredCQPage />} />
            <Route path="/creative-cq" element={<CreativeCQPage />} />
            <Route path="/selftest/*" element={<SelfTestPage />} />
            <Route path="/bookcontent" element={<BookContentPage />} />
            <Route path="/ai-assistant" element={<AIAssistantPage />} />
            <Route path="/ai-chat" element={<AIChatPage />} />
            <Route path="/doubt-solve" element={<DoubtSolvePage />} />
            <Route path="/desmos-graph" element={<DesmosGraphPage />} />
            <Route path="/tools" element={<ToolsPage />} />
          </Routes>
        </div>
      </>
    );
  }
}

