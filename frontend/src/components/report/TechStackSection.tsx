import React from 'react';
import { DetectedTechnology, TechStackData } from '../../types/reportTypes'; // Use local frontend types

interface TechStackSectionProps {
  techStackData?: TechStackData;
}

const TechStackSection: React.FC<TechStackSectionProps> = ({ techStackData }) => {
  console.log('[TechStackSection] Received techStackData:', JSON.parse(JSON.stringify(techStackData || {})));

  if (!techStackData) {
    return <p className="text-slate-500">Tech stack information is not yet available.</p>;
  }

  if (techStackData.status === 'pending' || techStackData.status === 'processing') {
    return <p className="text-slate-500">Tech stack analysis is currently {techStackData.status}...</p>;
  }

  if (techStackData.status === 'error') {
    return <p className="text-red-500">Error loading tech stack data: {techStackData.error}</p>;
  }

  if (techStackData.status === 'skipped') {
    return <p className="text-slate-500">Tech stack analysis was skipped. {techStackData.error ? `Reason: ${techStackData.error}` : ''}</p>;
  }

  if (!techStackData.detectedTechnologies || techStackData.detectedTechnologies.length === 0) {
    return <p className="text-slate-500">No technologies detected.</p>;
  }

  const { detectedTechnologies } = techStackData;

  // Group technologies by category
  const categories: { [key: string]: DetectedTechnology[] } = {};
  detectedTechnologies.forEach((tech: DetectedTechnology) => {
    // Ensure categories is an array and has elements before proceeding
    if (Array.isArray(tech.categories) && tech.categories.length > 0) {
      tech.categories.forEach((cat: { id: number; name: string; slug: string }) => {
        if (!categories[cat.name]) {
          categories[cat.name] = [];
        }
        // Avoid duplicate entries if a tech belongs to multiple displayed categories by slug
        if (!categories[cat.name].find(t => t.slug === tech.slug)) {
          categories[cat.name].push(tech);
        }
      });
    } else {
      // Handle technologies with no categories or undefined categories array
      const defaultCategory = "Other Technologies";
      if (!categories[defaultCategory]) {
        categories[defaultCategory] = [];
      }
      if (!categories[defaultCategory].find(t => t.slug === tech.slug)) {
        categories[defaultCategory].push(tech);
      }
    }
  });

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-slate-700 mb-4">Detected Technologies</h3>
      {Object.entries(categories).map(([categoryName, techs]) => (
        <div key={categoryName} className="mb-6 p-4 bg-white rounded-lg shadow border border-slate-200">
          <h4 className="text-lg font-medium text-sky-700 mb-3 capitalize">{categoryName}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {techs.map((tech) => (
              <div key={tech.slug} className="p-3 border border-slate-200 rounded-md bg-slate-50 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-1.5">
                  {tech.icon && (
                    <img 
                      src={`https://raw.githubusercontent.com/Lissy93/wapalyzer/main/src/drivers/webextension/images/icons/${tech.icon}`}
                      alt={`${tech.name} icon`}
                      className="w-5 h-5 mr-2 flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} // Hide if icon fails to load
                    />
                  )}
                  <h5 className="font-semibold text-slate-800 truncate" title={tech.name}>{tech.name}</h5>
                </div>
                {tech.version && <p className="text-xs text-slate-600 mb-0.5">Version: {tech.version}</p>}
                {/* <p className="text-xs text-slate-500">Confidence: {tech.confidence}%</p> */}
                {tech.website && (
                  <a 
                    href={tech.website}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-sky-600 hover:text-sky-700 hover:underline truncate block"
                    title={tech.website}
                  >
                    Visit website
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TechStackSection; 