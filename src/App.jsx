import React, { Component } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './Components/Navbar/Navbar';

import Dashboard from './Pages/Dashboard/Dashboard';
import BookContentPage from './Pages/BookContentPage';
import ExamplePage from './Pages/ExamplePage';
import ExampleWithAnswer from './Pages/ExampleWithAnswer';
import FilteredCQPage from './Pages/FilteredCQPage';
import CreativeCQPage from './Pages/CreativeCQPage';
import SelfTestPage from './Pages/SelfTestPage';


import AIAssistantPage from './Pages/AIAssistantPage';
import BornoAIPage from './Pages/BornoAIPage';
import AIChatPage from './Pages/AIChatPage';
import DoubtSolvePage from './Pages/DoubtSolvePage';
import UnlimitedAIQAPage from './Pages/UnlimitedAIQAPage';
import HMTAIPage from './Pages/HMTAI';
import AIAggregatorPage from './Pages/AIAggregatorPage';
import AIAggregatorPage2 from './Pages/AIAggregatorPage2';

import ChatPDFPage from './Pages/ChatPDFPage';
import MathGPTPage from './Pages/MathGPTPage';
import DesmosGraphPage from './Pages/DesmosGraphPage';
import ToolsPage from './Pages/ToolsPage';
import AIChatBotPage from './Pages/AIChatBotPage';
import LuziaChatBotPage from './Pages/LuziaChatBotPage';
import GemmyAIPage from './Pages/GemmyAIPage';
import PrivacyPolicy from './Pages/PrivacyPolicy';
import TermsOfService from './Pages/TermsOfService';


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
            <Route path="/unlimited-ai-qa" element={<UnlimitedAIQAPage />} />
            <Route path="/hmt-ai" element={<HMTAIPage />} />
            <Route path="/ai-aggregator" element={<AIAggregatorPage />} />
            <Route path="/ai-aggregator-2" element={<AIAggregatorPage2 />} />
            <Route path="/borno-ai" element={<BornoAIPage />} />
            <Route path="/mathgpt" element={<MathGPTPage />} />
            <Route path="/chatpdf" element={<ChatPDFPage />} />
            <Route path="/desmos-graph" element={<DesmosGraphPage />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/ai-chatbot" element={<AIChatBotPage />} />
            <Route path="/luzia-chatbot" element={<LuziaChatBotPage />} />
            <Route path="/gemmy-ai" element={<GemmyAIPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
          </Routes>
        </div>
      </>
    );
  }
}
