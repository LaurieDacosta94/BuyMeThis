import React, { useState, useEffect } from 'react';
import { ExternalLink, Loader2, ImageOff } from 'lucide-react';

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
      <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          <span className="text-xs text-slate-500">Loading preview...</span>
      </div>
  );

  if (error || !data) return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-600 hover:underline break-all text-sm p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
          <ExternalLink className="h-4 w-4 flex-shrink-0" /> {url}
      </a>
  );

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block group mt-3">
        <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all duration-300 h-24 group-hover:border-indigo-200">
            {data.image?.url ? (
                <img src={data.image.url} alt="" className="w-24 h-full object-cover shrink-0" />
            ) : (
                <div className="w-24 h-full bg-slate-100 flex items-center justify-center shrink-0">
                    <ImageOff className="h-6 w-6 text-slate-300" />
                </div>
            )}
            <div className="p-3 flex flex-col justify-center min-w-0 flex-1">
                <h4 className="font-bold text-slate-800 text-sm truncate pr-2 group-hover:text-indigo-700 transition-colors">{data.title || url}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">{data.description}</p>
                <div className="flex items-center gap-1 mt-auto pt-1">
                    {data.logo?.url && <img src={data.logo.url} className="w-3 h-3 rounded-full" alt="" />}
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{data.publisher || new URL(url).hostname}</span>
                </div>
            </div>
        </div>
    </a>
  );
};