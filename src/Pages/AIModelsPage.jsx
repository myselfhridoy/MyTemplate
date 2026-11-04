import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AI_MODELS } from '../Components/AI/ai-models';

export default function AIModelsPage() {
  const navigate = useNavigate();
  const models = Object.entries(AI_MODELS);

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <h1 className="ios-title mb-1">AI Assistant</h1>
        <p className="ios-subhead mb-6">একটি মডেল বেছে নিন</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {models.map(([id, config]) => (
            <button
              key={id}
              type="button"
              onClick={() => navigate(`/ai/${id}`)}
              className="ios-card ios-pressable p-4 text-left w-full flex items-center gap-3"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: `${config.color}20`, color: config.color }}
                aria-hidden="true"
              >
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[15px] truncate">{config.label}</p>
                <p className="text-xs text-base-content/50 mt-0.5">Tap to open</p>
              </div>
              <svg className="w-4 h-4 text-base-content/30 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
