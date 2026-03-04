import React from 'react';

// MCQ option labels (Bengali)
const MCQ_OPTION_LABELS = ['ক', 'খ', 'গ', 'ঘ'];

function MCQCard({
    item,
    idx,
    currentPage,
    pageSize,
    viewType,
    openAnswerIdx,
    setOpenAnswerIdx,
    setAskAI,
    renderText,
    getBengaliNum,
    fallbackStem,
    showStem = true,
}) {
    const globalIdx = (currentPage - 1) * pageSize + idx + 1;
    const d = item.data;
    if (!d) return null;

    const answerKey = `mcq-${idx}`;
    const isOpen = openAnswerIdx === answerKey;

    // Explanation text (could be full_explanation or text)
    const explanationText = d.answer_explanation?.full_explanation || d.answer_explanation?.text || '';
    const finalAnswer = d.answer_explanation?.final_answer || '';

    // Situation Set MCQ: ২য় প্রশ্নে stem খালি থাকলে আগের প্রশ্নের stem ব্যবহার করো
    const ownStem = d.shared_stem && d.shared_stem.text ? d.shared_stem : null;
    const effectiveStem = ownStem || fallbackStem || null;

    return (
        <div className="card bg-base-100 shadow-xl my-3 sm:my-4 overflow-hidden">
            <div className="card-body p-3 sm:p-5" style={{ wordBreak: 'break-word' }}>
                {/* Header */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                    <h2 className="card-title text-base sm:text-lg font-bold">
                        {getBengaliNum(globalIdx)}।
                    </h2>
                    {d.question_no && (
                        <span className="badge badge-xs sm:badge-sm badge-outline whitespace-nowrap">
                            প্রশ্ন: {getBengaliNum(d.question_no)}
                        </span>
                    )}
                    {d.mcq_type && (
                        <span className={`badge badge-xs sm:badge-sm whitespace-nowrap ${d.mcq_type === 'Situation Set MCQ' ? 'badge-info' :
                            d.mcq_type === 'Multiple Completion MCQ' ? 'badge-warning' :
                                'badge-ghost'
                            }`}>
                            {d.mcq_type === 'Situation Set MCQ' ? 'অনুচ্ছেদ' :
                                d.mcq_type === 'Multiple Completion MCQ' ? 'বহুপূরণ' :
                                    'সাধারণ'}
                        </span>
                    )}
                    <button
                        className="btn btn-xs btn-accent sm:ml-auto"
                        onClick={() => {
                            const optionsText = MCQ_OPTION_LABELS
                                .filter(k => d.options?.[k])
                                .map(k => `${k}) ${d.options[k]}`)
                                .join('\n');
                            const stmts = (d.multi_statements && d.multi_statements.length > 0)
                                ? d.multi_statements.map((s, i) => `${['i', 'ii', 'iii', 'iv'][i] || (i + 1)}. ${s}`).join('\n') + '\n'
                                : '';
                            const mcqPrompt = d.mcq_type === 'Multiple Completion MCQ' ? 'নিচের কোনটি সঠিক?\n' : '';
                            setAskAI({
                                open: true,
                                questionText: `${d.question_text || ''}\n${stmts}${mcqPrompt}${optionsText}`,
                                stemText: effectiveStem?.text || '',
                                imageUrl: (effectiveStem?.has_image && effectiveStem?.image_url) || '',
                                source: item.source || '',
                                marks: d.marks || '1',
                                finalAnswer: d.correct_answer ? `সঠিক উত্তর: ${d.correct_answer}` : '',
                                steps: explanationText,
                            });
                        }}
                    >
                        🤖 Ask AI
                    </button>
                </div>

                {/* Shared Stem / উদ্দীপক — শুধু প্রথম প্রশ্নে দেখাবে, রিপিট না */}
                {showStem && effectiveStem && effectiveStem.text && (
                    <div className="border-b pb-3 mb-3 bg-base-200/50 rounded-lg p-2 sm:p-3">
                        <span className="badge badge-xs badge-primary mb-1">উদ্দীপক</span>
                        <div className="text-sm sm:text-base mt-1">{renderText(effectiveStem.text)}</div>
                        {effectiveStem.has_image && effectiveStem.image_url && (
                            <div className="flex justify-center mt-2">
                                <img
                                    src={effectiveStem.image_url}
                                    alt="stem"
                                    className="rounded-lg max-w-xs h-auto"
                                    style={{ maxHeight: '200px', objectFit: 'contain' }}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Question text */}
                {d.question_text && (
                    <div className="mb-3 font-semibold text-sm sm:text-base">
                        {renderText(d.question_text)}
                    </div>
                )}

                {/* Multi statements (for Multiple Completion MCQ) */}
                {d.multi_statements && d.multi_statements.length > 0 && (
                    <div className="mb-3 pl-4 border-l-2 border-info/50">
                        {d.multi_statements.map((stmt, si) => (
                            <div key={si} className="flex gap-2 mb-1 text-sm">
                                <span className="font-bold text-info min-w-[20px]">
                                    {['i', 'ii', 'iii', 'iv'][si] || (si + 1)}.
                                </span>
                                <span>{renderText(stmt)}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Options */}
                {d.options && (
                    <>
                        {/* Multiple Completion MCQ তে options এর আগে */}
                        {d.mcq_type === 'Multiple Completion MCQ' && (
                            <div className="mb-2 font-semibold text-sm">নিচের কোনটি সঠিক?</div>
                        )}
                        <div className="grid grid-cols-1 gap-1.5 sm:gap-2 mb-3">
                            {MCQ_OPTION_LABELS.map(key => {
                                const optionVal = d.options[key];
                                if (optionVal === undefined || optionVal === null) return null;
                                const isCorrect = isOpen && d.correct_answer === key;
                                return (
                                    <div
                                        key={key}
                                        className={`flex items-start gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-lg border transition-all duration-200 ${isCorrect
                                            ? 'border-success bg-success/10 shadow-sm'
                                            : 'border-base-300 hover:border-base-content/20'
                                            }`}
                                    >
                                        <span className={`badge badge-xs sm:badge-sm mt-0.5 font-bold flex-shrink-0 ${isCorrect ? 'badge-success text-white' : 'badge-outline'
                                            }`}>
                                            {key}
                                        </span>
                                        <span className="text-xs sm:text-sm flex-1">{renderText(String(optionVal))}</span>
                                        {isCorrect && (
                                            <span className="text-success text-sm">✓</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Answer toggle */}
                {viewType === 'all' && d.correct_answer && (
                    <div>
                        <button
                            className={`btn btn-sm mb-2 ${isOpen ? 'btn-success' : 'btn-outline btn-success'}`}
                            onClick={() => setOpenAnswerIdx(isOpen ? null : answerKey)}
                        >
                            {isOpen ? '🔒 উত্তর লুকান' : '🔓 উত্তর দেখুন'}
                        </button>
                        {isOpen && (
                            <div className="p-2.5 sm:p-4 bg-success/5 rounded-lg border border-success/20 space-y-2 sm:space-y-3">
                                {/* Correct answer badge */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="badge badge-success text-white font-bold gap-1 py-3 text-xs sm:text-sm">
                                        ✓ সঠিক উত্তর: {d.correct_answer}
                                    </span>
                                    {finalAnswer && (
                                        <span className="text-xs sm:text-sm font-semibold">{renderText(finalAnswer)}</span>
                                    )}
                                </div>

                                {/* Explanation */}
                                {explanationText && (
                                    <div className="mt-2">
                                        <span className="font-semibold text-xs sm:text-sm text-success">ব্যাখ্যা:</span>
                                        <div className="mt-1 text-xs sm:text-sm leading-relaxed">
                                            {renderText(explanationText)}
                                        </div>
                                    </div>
                                )}

                                {/* Shortcut */}
                                {d.answer_explanation?.shortcut && (
                                    <div className="mt-2 p-2 bg-warning/10 rounded border border-warning/20">
                                        <span className="font-semibold text-xs text-warning">💡 শর্টকাট: </span>
                                        <span className="text-sm">{renderText(d.answer_explanation.shortcut)}</span>
                                    </div>
                                )}

                                {/* Steps */}
                                {d.answer_explanation?.steps && d.answer_explanation.steps.length > 0 && (
                                    <div className="mt-2">
                                        <span className="font-semibold text-xs">📝 ধাপসমূহ:</span>
                                        <ol className="list-decimal list-inside mt-1 space-y-1 text-sm">
                                            {d.answer_explanation.steps.map((step, si) => (
                                                <li key={si}>{renderText(step)}</li>
                                            ))}
                                        </ol>
                                    </div>
                                )}

                                {/* Explanation image */}
                                {d.answer_explanation?.has_image && d.answer_explanation?.image_url && (
                                    <div className="flex justify-center mt-2">
                                        <img
                                            src={d.answer_explanation.image_url}
                                            alt="explanation"
                                            className="rounded-lg max-w-xs h-auto"
                                            style={{ maxHeight: '200px', objectFit: 'contain' }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MCQCard;
