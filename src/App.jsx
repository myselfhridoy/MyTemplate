import React, { Component } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './Components/Navbar/Navbar';

import Dashboard from './Pages/Dashboard/Dashboard';
import BookContentPage from './Pages/BookContentPage';
import ExamplePage from './Pages/ExamplePage';
import ExampleWithAnswer from './Pages/ExampleWithAnswer';
import FilteredCQPage from './Pages/FilteredCQPage';
import CreativeCQPage from './Pages/CreativeCQPage';
import BoardCQPage from './Pages/BoardCQPage';
import ChapterPDFPage from './Pages/ChapterPDFPage';
import SelfTestPage from './Pages/SelfTestPage';



import AIAssistantPage from './Pages/AIAssistantPage';
import BornoAIPage from './Pages/BornoAIPage';
import AIChatPage from './Pages/AIChatPage';
import DoubtSolvePage from './Pages/DoubtSolvePage';
import UnlimitedAIQAPage from './Pages/UnlimitedAIQAPage';
import HMTAIPage from './Pages/HMTAI';
import HMTAiPageNew from './Pages/HMTAiPage';
import AIAggregatorPage from './Pages/AIAggregatorPage';
import AIAggregatorPage2 from './Pages/AIAggregatorPage2';

import ChatPDFPage from './Pages/ChatPDFPage';
import MathGPTPage from './Pages/MathGPTPage';
import MathGPTV2Page from './Pages/MathGPTV2Page';
import NoteGPTPage from './Pages/NoteGPTPage';
import DesmosGraphPage from './Pages/DesmosGraphPage';
import ToolsPage from './Pages/ToolsPage';
import AIChatBotPage from './Pages/AIChatBotPage'; // Kept for legacy if needed, but route hijacked
import PuterChatPage from './Pages/PuterChatPage';
import LuziaChatBotPage from './Pages/LuziaChatBotPage';
import GemmyAIPage from './Pages/GemmyAIPage';
import NewsFeedPage from './Pages/NewsFeedPage';
import PrivacyPolicy from './Pages/PrivacyPolicy';
import TermsOfService from './Pages/TermsOfService';


import { AuthProvider } from './Context/AuthContext';
import LoginPage from './Pages/LoginPage';
import AdminPage from './Pages/AdminPage';
import AttendancePage from './Pages/AttendancePage';
import RoutinePage from './Pages/RoutinePage';
import AdminRoute from './Components/AdminRoute';
import PrivateRoute from './Components/PrivateRoute';
import ProfilePage from './Pages/ProfilePage';

import { MathJaxContext } from 'better-react-mathjax';

const mathJaxConfig = {
  loader: { load: ["input/tex", "output/chtml", "[tex]/textmacros"] },
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']]
  },
  chtml: {
    displayAlign: 'left',
    displayIndent: '0em',
    scale: 1.1,
    mtextInheritFont: true,
    matchFontHeight: false
  },
  options: {
    renderActions: {
      addMenu: [],
      checkLoading: [],
      addEvents: []
    },
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
    ignoreHtmlClass: 'tex2jax_ignore',
    processHtmlClass: 'tex2jax_process'
  }
};

export default class App extends Component {
  render() {
    return (
      <MathJaxContext config={mathJaxConfig}>
        <AuthProvider>
          <Navbar />
          <div className="pt-16 min-h-screen">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
              <Route path="/attendance" element={<AdminRoute><AttendancePage /></AdminRoute>} />
              <Route path="/routine" element={<PrivateRoute><RoutinePage /></PrivateRoute>} />
              <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/example" element={<PrivateRoute><ExamplePage /></PrivateRoute>} />
              <Route path="/example-with-answer" element={<PrivateRoute><ExampleWithAnswer /></PrivateRoute>} />
              <Route path="/cq-filter" element={<PrivateRoute><FilteredCQPage /></PrivateRoute>} />
              <Route path="/creative-cq" element={<AdminRoute><CreativeCQPage /></AdminRoute>} />
              <Route path="/board-cq" element={<PrivateRoute><BoardCQPage /></PrivateRoute>} />
              <Route path="/chapter-pdf" element={<AdminRoute><ChapterPDFPage /></AdminRoute>} />
              <Route path="/selftest/*" element={<AdminRoute><SelfTestPage /></AdminRoute>} />
              <Route path="/bookcontent" element={<AdminRoute><BookContentPage /></AdminRoute>} />
              <Route path="/ai-assistant" element={<PrivateRoute><AIAssistantPage /></PrivateRoute>} />
              <Route path="/ai-chat" element={<PrivateRoute><AIChatPage /></PrivateRoute>} />
              <Route path="/doubt-solve" element={<PrivateRoute><DoubtSolvePage /></PrivateRoute>} />
              <Route path="/unlimited-ai-qa" element={<PrivateRoute><UnlimitedAIQAPage /></PrivateRoute>} />
              <Route path="/hmt-ai" element={<PrivateRoute><HMTAIPage /></PrivateRoute>} />
              <Route path="/hmtai-new" element={<PrivateRoute><HMTAiPageNew /></PrivateRoute>} />
              <Route path="/ai-aggregator" element={<PrivateRoute><AIAggregatorPage /></PrivateRoute>} />
              <Route path="/ai-aggregator-2" element={<AdminRoute><AIAggregatorPage2 /></AdminRoute>} />
              <Route path="/borno-ai" element={<PrivateRoute><BornoAIPage /></PrivateRoute>} />
              <Route path="/mathgpt" element={<PrivateRoute><MathGPTPage /></PrivateRoute>} />
              <Route path="/mathgpt-v2" element={<PrivateRoute><MathGPTV2Page /></PrivateRoute>} />
              <Route path="/notegpt" element={<PrivateRoute><NoteGPTPage /></PrivateRoute>} />
              <Route path="/chatpdf" element={<AdminRoute><ChatPDFPage /></AdminRoute>} />
              <Route path="/desmos-graph" element={<PrivateRoute><DesmosGraphPage /></PrivateRoute>} />
              <Route path="/tools" element={<PrivateRoute><ToolsPage /></PrivateRoute>} />
              <Route path="/ai-chatbot" element={<PrivateRoute><PuterChatPage /></PrivateRoute>} />
              <Route path="/luzia-chatbot" element={<PrivateRoute><LuziaChatBotPage /></PrivateRoute>} />
              <Route path="/gemmy-ai" element={<PrivateRoute><GemmyAIPage /></PrivateRoute>} />
              <Route path="/newsfeed" element={<PrivateRoute><NewsFeedPage /></PrivateRoute>} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
            </Routes>
          </div>
        </AuthProvider>
      </MathJaxContext>
    );
  }
}
