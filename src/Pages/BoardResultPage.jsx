import React, { useState, useEffect } from "react";

const BoardResultPage = () => {
  const [captcha, setCaptcha] = useState(null);
  const [captchaCode, setCaptchaCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [showAllYears, setShowAllYears] = useState(false);
  
  // Form fields
  const [formData, setFormData] = useState({
    board: "",
    exam: "",
    year: "",
    result_type: "1",
    roll: "",
    reg: ""
  });

  const boardOptions = [
    { value: "barisal", label: "বরিশাল" },
    { value: "chittagong", label: "চট্টগ্রাম" },
    { value: "comilla", label: "কুমিল্লা" },
    { value: "dhaka", label: "ঢাকা" },
    { value: "dinajpur", label: "দিনাজপুর" },
    { value: "jessore", label: "যশোর" },
    { value: "madrasah", label: "মাদ্রাসা / Madrasah" },
    { value: "mymensingh", label: "ময়মনসিংহ" },
    { value: "rajshahi", label: "রাজশাহী" },
    { value: "sylhet", label: "সিলেট" },
    { value: "tec", label: "টেকনিক্যাল / Technical" }
  ];

  const examOptions = [
    { value: "jsc", label: "JSC/JDC (জে.এস.সি/জে.ডি.সি)" },
    { value: "ssc", label: "SSC/Dakhil/Equivalent (এস.এস.সি/দাখিল/সমমান)" },
    { value: "hsc", label: "HSC/Alim/Equivalent (এইচ.এস.সি/আলিম/সমমান)" },
    { value: "dibs", label: "DIBS (Diploma in Business Studies)" }
  ];

  // Generate years from 1996 up to current year so options stay up to date
  const generateYearOptions = (start = 1996) => {
    const currentYear = new Date().getFullYear();
    const arr = [];
    for (let y = currentYear; y >= start; y--) {
      arr.push({ value: String(y), label: String(y) });
    }
    return arr;
  };

  const yearOptions = generateYearOptions(1996);
  // By default show a shorter list to avoid a very long dropdown; user can expand
  const displayedYearOptions = showAllYears ? yearOptions : yearOptions.slice(0, 10);

  // Fetch captcha from your backend
  const fetchCaptcha = async () => {
    try {
      setLoading(true);
      setError("");
      setCaptchaCode(""); // Clear previous code
      
      const response = await fetch('https://geminiai-render.onrender.com/api/test-api/captcha', {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error('ক্যাপচা লোড করতে সমস্যা হয়েছে');
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setCaptcha(data.captchaData); // Base64 data URI from backend
        setSessionId(data.sessionId);   // Session ID from backend
      } else {
        throw new Error(data.msg || 'ক্যাপচা লোড ব্যর্থ');
      }
    } catch (err) {
      setError(`ক্যাপচা লোড করতে সমস্যা: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Submit form to your backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Require board/exam/year/roll/reg and captcha
    if (!formData.board || !formData.exam || !formData.year) {
      setError('বোর্ড, পরীক্ষা ও সাল নির্বাচন করা বাধ্যতামূলক।');
      return;
    }
    if (!formData.roll || !formData.reg || !captchaCode) {
      setError("রোল নম্বর, রেজিস্ট্রেশন নম্বর এবং ক্যাপচা কোড দিতে হবে");
      return;
    }
    
    if (!captcha || !sessionId) {
      setError("প্রথমে ক্যাপচা লোড করুন");
      return;
    }
    
    if (captchaCode.length !== 4 || !/^\d+$/.test(captchaCode)) {
      setError("ক্যাপচা কোড ৪ সংখ্যার হতে হবে");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      setResult(null);
      // Log request payload for debugging
      const payload = {
        board: formData.board,
        exam: formData.exam,
        year: formData.year,
        result_type: formData.result_type,
        roll: formData.roll,
        reg: formData.reg,
        captcha: captchaCode,
        sessionId: sessionId
      };
      console.debug('BoardResult: sending request payload ->', payload);

      const response = await fetch('https://geminiai-render.onrender.com/api/test-api/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ফলাফল আনতে সমস্যা হয়েছে`);
      }
      
      const data = await response.json();
      // Log entire response JSON so dev can inspect unexpected shapes
      console.debug('BoardResult: server response ->', data);
      
        // Accept success when data.status === 0 and data.res exists
        if (data && data.status === 0 && data.res) {
        // Ensure we have the full response structure with sub_details and flags
        const resultData = {
          ...data.res,
          sub_details: data.sub_details || [],
          display_details: data.res.display_details || "",
          // top-level flags sometimes appear outside res
          showmarks: typeof data.showmarks !== 'undefined' ? data.showmarks : (data.res.showmarks ?? 0),
          totalonly: typeof data.totalonly !== 'undefined' ? data.totalonly : (data.res.totalonly ?? 0),
          hidefailed: typeof data.hidefailed !== 'undefined' ? data.hidefailed : (data.res.hidefailed ?? 0)
        };

        // Show result on same page
        setResult(resultData);
        setError(""); // Clear errors on success
      } else {
        // Try to extract an informative message from common fields
        let errorMsg =
          (data && (data.msg || data.message || data.error)) ||
          (data && data.errors ? (Array.isArray(data.errors) ? data.errors.join(', ') : JSON.stringify(data.errors)) : null) ||
          'কোনো ফলাফল পাওয়া যায়নি।';

        // Normalize message to string
        errorMsg = typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg);

        // Specific checks for captcha/session to show helpful instructions
        const lower = errorMsg.toLowerCase();
        if (lower.includes('security key') || lower.includes('captcha')) {
          setError('❌ ক্যাপচা কোড ভুল বা মেয়াদ শেষ। নতুন ক্যাপচা নিয়ে আবার চেষ্টা করুন।');
          // Auto refresh captcha after 2 seconds
          setTimeout(() => {
            refreshCaptcha();
          }, 2000);
        } else if (lower.includes('no data found') || lower.includes('no data') || lower.includes('not found')) {
          setError('❌ এই তথ্য দিয়ে কোনো ফলাফল পাওয়া যায়নি। রোল ও রেজিস্ট্রেশন নম্বর চেক করুন।');
        } else if (lower.includes('সেশনটি পাওয়া যায়নি') || lower.includes('মেয়াদ') || lower.includes('session')) {
          setError('❌ সেশন মেয়াদ শেষ। নতুন ক্যাপচা লোড করুন।');
          setTimeout(() => {
            refreshCaptcha();
          }, 1000);
        } else {
          // Show server message as-is (prefix with an icon for visibility)
          setError(`❌ ${errorMsg}`);
        }
      }
    } catch (err) {
      setError(`❌ নেটওয়ার্ক ত্রুটি: ${err.message}`);
      console.error('Submit error:', err);
    } finally {
      setLoading(false);
      // Refresh captcha after submit attempt so clicking 'ফলাফল দেখুন' changes captcha
      try {
        fetchCaptcha();
      } catch (e) {
        console.warn('Captcha refresh failed:', e);
      }
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const refreshCaptcha = () => {
    setCaptcha(null);
    setCaptchaCode("");
    setSessionId("");
    fetchCaptcha();
  };



  // Auto-load captcha when component mounts
  useEffect(() => {
    fetchCaptcha();
  }, []);

  const resetForm = () => {
    setResult(null);
    setError("");
    setCaptchaCode("");
    setFormData({
      board: "",
      exam: "",
      year: "",
      result_type: "1",
      roll: "",
      reg: ""
    });
    fetchCaptcha(); // Refresh captcha
  };

  return (
    <div className="max-w-4xl mx-auto" style={{ fontFamily: "'Hind Siliguri', 'Kalpurush', 'Noto Sans Bengali', sans-serif" }}>
      {!result ? (
        // Form Section
        <div className="bg-white dark:bg-base-200 rounded shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-center">বোর্ড পরীক্ষার ফলাফল</h2>
        
        {/* Loading indicator */}
        {loading && (
          <div className="alert alert-info mb-4">
            <span className="loading loading-spinner loading-sm mr-2"></span>
            <span>{captcha ? 'ফলাফল খোঁজা হচ্ছে...' : 'অপেক্ষা করুন...'}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Board, Exam, Year */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">
                <span className="label-text font-semibold">বোর্ড</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={formData.board}
                onChange={(e) => handleInputChange('board', e.target.value)}
                required
              >
                <option value="" disabled>-- নির্বাচন করুন --</option>
                {boardOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="label">
                <span className="label-text font-semibold">পরীক্ষা</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={formData.exam}
                onChange={(e) => handleInputChange('exam', e.target.value)}
                required
              >
                <option value="" disabled>-- নির্বাচন করুন --</option>
                {examOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="label">
                <span className="label-text font-semibold">সাল</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={formData.year}
                onChange={(e) => handleInputChange('year', e.target.value)}
                required
              >
                <option value="" disabled>-- নির্বাচন করুন --</option>
                {yearOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Roll and Registration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                <span className="label-text font-semibold">রোল নম্বর *</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="রোল নম্বর লিখুন"
                value={formData.roll}
                onChange={(e) => handleInputChange('roll', e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className="label">
                <span className="label-text font-semibold">রেজিস্ট্রেশন নম্বর *</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="রেজিস্ট্রেশন নম্বর লিখুন"
                value={formData.reg}
                onChange={(e) => handleInputChange('reg', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Captcha Section */}
          <div className="space-y-4">
            <div>
              <label className="label">
                <span className="label-text font-semibold">ক্যাপচা *</span>
              </label>
              
              <div className="bg-base-200 p-4 rounded-lg space-y-3">
                {captcha ? (
                  <div>
                    <div className="flex flex-col items-center space-y-2">
                      <div className="relative">
                        {loading && (
                          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded">
                            <span className="loading loading-spinner loading-md"></span>
                          </div>
                        )}
                        <img 
                          src={captcha} 
                          alt="Captcha" 
                          className="border border-gray-300 rounded max-w-xs bg-white p-2"
                          onError={() => {
                            setError('ক্যাপচা ইমেজ লোড করতে সমস্যা হয়েছে। নতুন ক্যাপচা চেষ্টা করুন।');
                          }}
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={refreshCaptcha}
                        className="btn btn-sm btn-outline"
                        disabled={loading}
                      >
                        {loading ? "লোড হচ্ছে..." : "নতুন ক্যাপচা"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <button 
                      type="button"
                      onClick={fetchCaptcha}
                      className="btn btn-sm btn-primary"
                      disabled={loading}
                    >
                      {loading ? "লোড হচ্ছে..." : "ক্যাপচা দেখুন"}
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <label className="label">
                <span className="label-text font-semibold">ক্যাপচা কোড *</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="ক্যাপচা কোড লিখুন (4 সংখ্যা)"
                value={captchaCode}
                onChange={(e) => {
                  // Only allow numbers and max 4 digits
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setCaptchaCode(value);
                }}
                maxLength="4"
                pattern="[0-9]{4}"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                loading || !captcha || !sessionId || !formData.board || !formData.exam || !formData.year
              }
            >
              {loading ? "অনুসন্ধান করা হচ্ছে..." : "ফলাফল দেখুন"}
            </button>
          </div>
        </form>

          {/* Error Display */}
          {error && (
            <div className="alert alert-error mt-4">
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        // Result Display Section
        <div className="bg-white dark:bg-base-200 rounded shadow p-6">
          {/* Print header removed as requested */}

          {/* Back Button */}
          <div className="mb-4 no-print">
            <button 
              onClick={resetForm}
              className="btn btn-ghost btn-sm"
            >
              ← নতুন ফলাফল খুঁজুন
            </button>
          </div>

          {/* Result Display */}
          <div className="print-container bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl shadow-lg p-6 border border-green-200 dark:border-green-700">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mx-auto mb-2">
                <img src="/HMT Logo.png" alt="HMT Logo" style={{ width: 110, height: 'auto', objectFit: 'contain' }} />
              </div>
              <h3 className="text-3xl font-bold text-success mb-3">🎉 ফলাফল প্রকাশিত</h3>
              <div 
                className="bg-gradient-to-r from-primary to-secondary text-white rounded-xl p-4 shadow-lg inline-block"
                style={{ background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', color: 'white' }}
              >
                <div className="text-sm text-white/80 mb-1" style={{ color: '#e0e7ff' }}>জিপিএ</div>
                <div className="text-4xl font-bold" style={{ color: 'white' }}>
                  {result.res_detail ? result.res_detail.replace('GPA=', '').replace('[', '').replace(']', '') : ''}
                </div>
              </div>
            </div>

            {/* Student Information */}
            <div className="bg-white dark:bg-base-200 rounded-lg p-4 mb-4 shadow-sm">
              <h4 className="text-lg font-semibold text-primary mb-3 border-b border-gray-200 pb-2">
                শিক্ষার্থীর তথ্য
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex">
                    <span className="w-24 font-medium text-gray-600">নাম:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{result.name}</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 text-gray-600 font-medium">পিতা:</span>
                    <span className="text-gray-700 dark:text-gray-300">{result.fname}</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 text-gray-600 font-medium">মাতা:</span>
                    <span className="text-gray-700 dark:text-gray-300">{result.mname}</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 text-gray-600 font-medium">রোল:</span>
                    <span className="font-semibold text-primary">{result.roll_no}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex">
                    <span className="w-24 text-gray-600 font-medium">বোর্ড:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{result.board_name}</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 text-gray-600 font-medium">বিভাগ:</span>
                    <span className="text-gray-700 dark:text-gray-300">{result.stud_group}</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 text-gray-600 font-medium">ধরন:</span>
                    <span className="text-gray-700 dark:text-gray-300">{result.stud_type}</span>
                  </div>
                  {result.sex && (
                    <div className="flex">
                      <span className="w-24 text-gray-600 font-medium">লিঙ্গ:</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {result.sex === "1" ? "মহিলা" : "পুরুষ"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Institution */}
            <div className="bg-white dark:bg-base-200 rounded-lg p-4 mb-4 shadow-sm">
              <h4 className="text-lg font-semibold text-primary mb-2 border-b border-gray-200 pb-2">
                শিক্ষা প্রতিষ্ঠান
              </h4>
              <p className="text-gray-700 dark:text-gray-300 font-medium">{result.inst_name}</p>
            </div>

            {/* Subject-wise Results */}
            {result.display_details && (
              <div className="bg-white dark:bg-base-200 rounded-lg p-4 shadow-sm">
                <h4 className="text-lg font-semibold text-primary mb-3 border-b border-gray-200 pb-2">
                  বিষয়ভিত্তিক ফলাফল
                </h4>
                <div className="overflow-x-auto">
                  {(() => {
                    const subjects = (result.display_details || '').split(',').map(s => s.trim()).filter(Boolean);
                    const subjectDetails = result.sub_details || [];
                    // Robust auto-detect: check each subject's score part for any numeric token
                    const autoDetectMarks = subjects.some(detail => {
                      const parts = (detail || '').split(':');
                      const scoreRaw = (parts[1] || '').trim();
                      if (!scoreRaw) return false;
                      // If contains '=', check both sides for numeric marks
                      if (scoreRaw.includes('=')) {
                        const [left, right] = scoreRaw.split('=');
                        if (/^\d+$/.test(left.trim()) || /^\d+$/.test(right.trim())) return true;
                      }
                      // If the whole score is numeric (or contains a clear numeric token), treat as marks
                      if (/^\d+$/.test(scoreRaw)) return true;
                      // Catch patterns like '34/50' or '34 (A+)' by checking for any standalone number
                      if (/\d+/.test(scoreRaw)) return true;
                      return false;
                    });
                    // Only show Marks column when numeric marks were actually detected
                    const showMarks = autoDetectMarks;
                    return (
                      <table className="table table-zebra w-full text-sm">
                        <thead>
                          <tr 
                            className="bg-gradient-to-r from-primary to-secondary text-primary-content"
                            style={{ background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', color: 'white' }}
                          >
                            <th className="text-center font-semibold" style={{ color: 'white' }}>কোড</th>
                            <th className="font-semibold" style={{ color: 'white' }}>বিষয়ের নাম</th>
                            {showMarks && <th className="text-center font-semibold" style={{ color: 'white' }}>নম্বর</th>}
                            <th className="text-center font-semibold" style={{ color: 'white' }}>গ্রেড</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjects.map((detail, index) => {
                            const [codesPart, scorePartRaw] = detail.split(':');
                            const scorePart = (scorePartRaw || '').trim();
                            let marks = null;
                            let grade = '';

                            if (scorePart && scorePart.includes('=') && scorePart.split('=').length === 2) {
                              const [left, right] = scorePart.split('=');
                              const leftTrim = left.trim();
                              const rightTrim = right.trim();
                              if (/^\d+$/.test(leftTrim)) {
                                marks = leftTrim;
                                grade = rightTrim;
                              } else {
                                marks = null;
                                grade = rightTrim || leftTrim;
                              }
                            } else {
                              marks = null;
                              grade = scorePart || '';
                            }

                            const codes = codesPart.includes('-') ? codesPart.split('-') : [codesPart];
                            const subjectNames = codes.map(code => {
                              const info = subjectDetails.find(sub => sub.SUB_CODE === code);
                              return info ? info.SUB_NAME : `বিষয় ${code}`;
                            });
                            const uniqueNames = [...new Set(subjectNames)].join(', ');

                            return (
                              <tr key={index} className="hover:bg-base-100">
                                <td className="text-center font-mono font-semibold text-primary">
                                  {codes.map((code, idx) => (
                                    <div key={idx} className="leading-tight">{code}</div>
                                  ))}
                                </td>
                                <td className="font-medium text-gray-800 dark:text-gray-200">{uniqueNames}</td>
                                {showMarks && (
                                  <td className="text-center">
                                    <span className="font-bold text-lg text-primary">
                                      {marks && /^\d+$/.test(marks) ? marks : '—'}
                                    </span>
                                  </td>
                                )}
                                <td className="text-center">
                                  <span
                                    title={grade || '—'}
                                    className={`badge font-bold text-white px-3 py-1 rounded-full ${
                                      grade === 'A+' ? 'bg-green-500 border-green-500' :
                                      grade === 'A' ? 'bg-blue-500 border-blue-500' :
                                      grade === 'A-' ? 'bg-orange-500 border-orange-500' :
                                      grade === 'B' ? 'bg-purple-500 border-purple-500' :
                                      grade === 'C' ? 'bg-gray-500 border-gray-500' :
                                      grade === 'D' ? 'bg-yellow-500 border-yellow-500 text-black' :
                                      grade === 'F' ? 'bg-red-600 border-red-600' :
                                      'bg-red-500 border-red-500'
                                    }`}
                                  >
                                    {grade && grade !== '' ? grade : '—'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* CA / Additional Subjects */}
            {result.display_details_ca && result.display_details_ca.trim() !== '' && (
              <div className="bg-white dark:bg-base-200 rounded-lg p-4 shadow-sm mt-4">
                <h4 className="text-lg font-semibold text-primary mb-3 border-b border-gray-200 pb-2">অতিরিক্ত বিষয় (CA)</h4>
                <div className="overflow-x-auto">
                  {(() => {
                    const subjectsCa = (result.display_details_ca || '').split(',').map(s => s.trim()).filter(Boolean);
                    const subjectDetails = result.sub_details || [];
                    const autoDetectMarksCa = subjectsCa.some(detail => {
                      const parts = (detail || '').split(':');
                      const scoreRaw = (parts[1] || '').trim();
                      if (!scoreRaw) return false;
                      if (scoreRaw.includes('=')) {
                        const [left, right] = scoreRaw.split('=');
                        if (/^\d+$/.test(left.trim()) || /^\d+$/.test(right.trim())) return true;
                      }
                      if (/^\d+$/.test(scoreRaw)) return true;
                      if (/\d+/.test(scoreRaw)) return true;
                      return false;
                    });
                    const showMarksCa = autoDetectMarksCa;
                    return (
                      <table className="table table-zebra w-full text-sm">
                        <thead>
                          <tr className="bg-gradient-to-r from-primary to-secondary text-primary-content" style={{ background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', color: 'white' }}>
                            <th className="text-center font-semibold" style={{ color: 'white' }}>কোড</th>
                            <th className="font-semibold" style={{ color: 'white' }}>বিষয়ের নাম</th>
                            {showMarksCa && <th className="text-center font-semibold" style={{ color: 'white' }}>নম্বর</th>}
                            <th className="text-center font-semibold" style={{ color: 'white' }}>গ্রেড</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjectsCa.map((detail, index) => {
                            const [codesPart, scorePartRaw] = detail.split(':');
                            const scorePart = (scorePartRaw || '').trim();
                            let marks = null;
                            let grade = '';
                            if (scorePart && scorePart.includes('=') && scorePart.split('=').length === 2) {
                              const [left, right] = scorePart.split('=');
                              const leftTrim = left.trim();
                              const rightTrim = right.trim();
                              if (/^\d+$/.test(leftTrim)) {
                                marks = leftTrim;
                                grade = rightTrim;
                              } else {
                                marks = null;
                                grade = rightTrim || leftTrim;
                              }
                            } else {
                              marks = null;
                              grade = scorePart || '';
                            }

                            const codes = codesPart.includes('-') ? codesPart.split('-') : [codesPart];
                            const subjectNames = codes.map(code => {
                              const info = subjectDetails.find(sub => sub.SUB_CODE === code);
                              return info ? info.SUB_NAME : `বিষয় ${code}`;
                            });
                            const uniqueNames = [...new Set(subjectNames)].join(', ');

                            return (
                              <tr key={index} className="hover:bg-base-100">
                                <td className="text-center font-mono font-semibold text-primary">
                                  {codes.map((code, idx) => (
                                    <div key={idx} className="leading-tight">{code}</div>
                                  ))}
                                </td>
                                <td className="font-medium text-gray-800 dark:text-gray-200">{uniqueNames}</td>
                                {showMarksCa && (
                                  <td className="text-center">
                                    <span className="font-bold text-lg text-primary">
                                      {marks && /^\d+$/.test(marks) ? marks : '—'}
                                    </span>
                                  </td>
                                )}
                                <td className="text-center">
                                  <span
                                    title={grade || '—'}
                                    className={`badge font-bold text-white px-3 py-1 rounded-full ${
                                      grade === 'A+' ? 'bg-green-500 border-green-500' :
                                      grade === 'A' ? 'bg-blue-500 border-blue-500' :
                                      grade === 'A-' ? 'bg-orange-500 border-orange-500' :
                                      grade === 'B' ? 'bg-purple-500 border-purple-500' :
                                      grade === 'C' ? 'bg-gray-500 border-gray-500' :
                                      grade === 'D' ? 'bg-yellow-500 border-yellow-500 text-black' :
                                      grade === 'F' ? 'bg-red-600 border-red-600' :
                                      'bg-red-500 border-red-500'
                                    }`}
                                  >
                                    {grade && grade !== '' ? grade : '—'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Print Button */}
            <div className="text-center mt-6 no-print">
              <button 
                onClick={() => window.print()}
                className="btn btn-primary"
              >
                🖨️ প্রিন্ট করুন
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Print Styles */}
      <style jsx>{`
        @media print {
          /* Page sizing and background */
          @page { margin: 8mm; }

          /* Ensure the whole page background is white */
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            height: 100% !important;
          }

          /* Hide everything except result */
          body * {
            visibility: hidden;
          }
          
          /* Show only result container and its children */
          .print-container, .print-container * {
            visibility: visible;
          }
          
          /* Position result container */
          /* Position result container for print */
          .print-container {
            position: absolute;
            left: 0;
            top: 0; /* no extra header space */
            width: 100%;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          
          /* No print-only header (removed) */
          
          /* Hide no-print elements */
          .no-print {
            display: none !important;
          }
          
          /* Print-specific styling - reduce padding and tighten layout */
          .print-container {
            font-size: 11pt;
            line-height: 1.35;
            color: black !important;
            background: white !important;
            padding: 10px 12px !important;
            margin: 0 auto !important;
            max-width: 100% !important;
          }
          
          /* Table styling for print */
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          
          th, td {
            border: 1px solid #333 !important;
            padding: 8px !important;
          }

          /* Always white background and black text for table rows in print */
          tr, td, th {
            background: white !important;
            color: black !important;
          }

          /* Table header gradient simulation */
          .bg-gradient-to-r {
            background: linear-gradient(to right, #3b82f6, #8b5cf6) !important;
            color: white !important;
          }
          
          /* Color preservation */
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Grade badge colors for print */
          .badge {
            color: white !important;
            font-weight: bold !important;
            padding: 4px 8px !important;
            border-radius: 4px !important;
          }
          
          .bg-green-500 {
            background-color: #10b981 !important;
            color: white !important;
          }
          
          .bg-blue-500 {
            background-color: #3b82f6 !important;
            color: white !important;
          }
          
          .bg-orange-500 {
            background-color: #f97316 !important;
            color: white !important;
          }
          
          .bg-purple-500 {
            background-color: #8b5cf6 !important;
            color: white !important;
          }
          
          .bg-gray-500 {
            background-color: #6b7280 !important;
            color: white !important;
          }
          
          .bg-red-500 {
            background-color: #ef4444 !important;
            color: white !important;
          }
          
          /* Header colors */
          .text-primary {
            color: #3b82f6 !important;
          }
          
          .text-success {
            color: #10b981 !important;
          }
          
          /* Table header gradient simulation */
          .bg-gradient-to-r {
            background: linear-gradient(to right, #3b82f6, #8b5cf6) !important;
            color: white !important;
          }
        }
      `}</style>
      
      {/* Screen styles to ensure readability in light mode (only affect screen, not print) */}
      <style jsx>{`
        @media screen and (prefers-color-scheme: light) {
          /* Make container headings and labels dark for good contrast on pale backgrounds */
          .print-container,
          .print-container h3,
          .print-container h4,
          .print-container .text-primary,
          .print-container .font-medium,
          .print-container .label-text,
          .print-container .text-gray-700,
          .print-container .text-gray-600,
          .print-container .text-gray-800 {
            color: #0f1724 !important;
            opacity: 1 !important;
          }

          /* Keep grade badge text white so badges remain readable */
          .print-container .badge {
            color: #ffffff !important;
          }

          /* Ensure table header text is dark enough */
          .print-container thead th {
            color: #ffffff !important; /* headers use gradient background so keep them white */
          }
        }
      `}</style>
    </div>
  );
};

export default BoardResultPage;
