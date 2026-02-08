
import React, { useState, useEffect } from 'react';
import { ExternalLink, Loader2, ImageOff, Link as LinkIcon } from 'lucide-react';

export const LinkPreview = ({ url }: { url: string }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) return;
    setLoading(true);
    // Use Microlink API to fetch metadata
    fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
      .then(res => res.json())
      .then(json => {
        if (json.status === 'success') {
            setData(json.data);
        } else {
            setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [url]);

  if (!url) return null;
  
  if (loading) return (
      <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          <span className="text-xs text-slate-500">Loading preview...</span>
      </div>
  );

  if (error || !data) return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-600 hover:underline break-all text-sm p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
          <LinkIcon className="h-4 w-4 flex-shrink-0" /> {url}
      </a>
  );

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block group mt-4 no-underline">
        <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md hover:border-indigo-300 hover:bg-white flex flex-col sm:flex-row group-hover:-translate-y-1">
            {data.image?.url && (
                <div className="w-full sm:w-36 h-36 sm:h-auto shrink-0 relative overflow-hidden bg-slate-200">
                     <img src={data.image.url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
            )}
            <div className="p-4 flex flex-col justify-center min-w-0 flex-1">
                 <div className="flex items-center gap-2 mb-2">
                    {data.logo?.url ? <img src={data.logo.url} className="w-4 h-4 rounded-full bg-white shadow-sm" alt="" /> : <ExternalLink className="w-3 h-3 text-indigo-500" />}
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{data.publisher || new URL(url).hostname}</span>
                 </div>
                 <h4 className="font-bold text-slate-800 text-sm leading-tight mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">{data.title || url}</h4>
                 <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{data.description}</p>
            </div>
        </div>
    </a>
  );
};
