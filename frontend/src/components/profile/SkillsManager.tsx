import React, { useState } from 'react';
import { Plus, X, Wrench, Star, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

interface Skill {
  name: string;
  category: string;
  yearsOfExperience: number;
  certifications?: string[];
}

interface SkillsManagerProps {
  skills: Skill[];
  onChange: (skills: Skill[]) => void;
}

const SkillsManager: React.FC<SkillsManagerProps> = ({ skills, onChange }) => {
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newSkill, setNewSkill] = useState<Skill>({
    name: '',
    category: '',
    yearsOfExperience: 0,
    certifications: [],
  });

  const categories = [
    'plumbing',
    'electrical',
    'carpentry',
    'painting',
    'cleaning',
    'appliance_repair',
    'hvac',
    'locksmith',
    'landscaping',
    'roofing',
    'flooring',
    'masonry',
    'welding',
    'pest_control',
    'general_handyman',
    'other',
  ];

  const formatCategoryName = (category: string) => {
    return category
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleAddSkill = () => {
    if (newSkill.name && newSkill.category && newSkill.yearsOfExperience > 0) {
      onChange([...skills, newSkill]);
      setNewSkill({
        name: '',
        category: '',
        yearsOfExperience: 0,
        certifications: [],
      });
      setIsAddingSkill(false);
    }
  };

  const handleRemoveSkill = (index: number) => {
    const updatedSkills = skills.filter((_, i) => i !== index);
    onChange(updatedSkills);
  };

  const getProficiencyLevel = (years: number) => {
    if (years < 1) return { label: 'Beginner', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (years < 3) return { label: 'Intermediate', color: 'text-purple-600', bg: 'bg-purple-50' };
    if (years < 5) return { label: 'Advanced', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { label: 'Expert', color: 'text-green-600', bg: 'bg-green-50' };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center text-lg font-semibold text-ink">
            <Wrench className="mr-2 h-5 w-5 text-primary-600" />
            Your Skills
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            Add and manage your professional skills
          </p>
        </div>
        {!isAddingSkill && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAddingSkill(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Skill
          </Button>
        )}
      </div>

      {/* Add New Skill Form */}
      {isAddingSkill && (
        <div className="rounded-lg border-2 border-primary-200 bg-primary-50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-semibold text-ink">Add New Skill</h4>
            <button
              type="button"
              onClick={() => setIsAddingSkill(false)}
              className="hover:text-ink-muted text-ink-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-ink-muted">
                Category
              </label>
              <select
                value={newSkill.category}
                onChange={(e) =>
                  setNewSkill({ ...newSkill, category: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-line-strong px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20"
                required
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {formatCategoryName(category)}
                  </option>
                ))}
              </select>
            </div>

            {/* Skill Name */}
            <div>
              <label className="block text-sm font-medium text-ink-muted">
                Skill Name
              </label>
              <input
                type="text"
                value={newSkill.name}
                onChange={(e) =>
                  setNewSkill({ ...newSkill, name: e.target.value })
                }
                placeholder="e.g., Residential Plumbing, Circuit Installation"
                className="mt-1 w-full rounded-lg border border-line-strong px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20"
                required
              />
            </div>

            {/* Years of Experience */}
            <div>
              <label className="block text-sm font-medium text-ink-muted">
                Years of Experience
              </label>
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={newSkill.yearsOfExperience}
                onChange={(e) =>
                  setNewSkill({
                    ...newSkill,
                    yearsOfExperience: parseFloat(e.target.value),
                  })
                }
                className="mt-1 w-full rounded-lg border border-line-strong px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20"
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddingSkill(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleAddSkill}
                disabled={
                  !newSkill.name ||
                  !newSkill.category ||
                  newSkill.yearsOfExperience <= 0
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Skill
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Skills List */}
      {skills.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-line-strong bg-surface-100 p-8 text-center">
          <Wrench className="mx-auto h-12 w-12 text-ink-muted" />
          <h3 className="mt-4 text-sm font-semibold text-ink">
            No skills added yet
          </h3>
          <p className="mt-2 text-sm text-ink-muted">
            Start by adding your professional skills and expertise
          </p>
          {!isAddingSkill && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsAddingSkill(true)}
              className="mt-4"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Skill
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {skills.map((skill, index) => {
            const proficiency = getProficiencyLevel(skill.yearsOfExperience);
            return (
              <div
                key={index}
                className="group relative rounded-lg border border-line bg-surface-200 p-4 shadow-sm transition-all hover:shadow-md"
              >
                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(index)}
                  className="absolute right-2 top-2 rounded-full p-1 text-ink-muted opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                  title="Remove skill"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex items-start justify-between pr-8">
                  <div className="flex-1">
                    {/* Skill Name */}
                    <h4 className="font-semibold text-ink">{skill.name}</h4>

                    {/* Category */}
                    <div className="mt-2 flex items-center space-x-4 text-sm">
                      <span className="inline-flex items-center rounded-full bg-surface-300 px-3 py-1 text-ink-muted">
                        {formatCategoryName(skill.category)}
                      </span>

                      {/* Proficiency Badge */}
                      <span
                        className={cn(
                          'inline-flex items-center space-x-1 rounded-full px-3 py-1 font-medium',
                          proficiency.bg,
                          proficiency.color
                        )}
                      >
                        <Star className="h-3 w-3" />
                        <span>{proficiency.label}</span>
                      </span>

                      {/* Years of Experience */}
                      <span className="flex items-center text-ink-muted">
                        <TrendingUp className="mr-1 h-3 w-3" />
                        {skill.yearsOfExperience}{' '}
                        {skill.yearsOfExperience === 1 ? 'year' : 'years'}
                      </span>
                    </div>

                    {/* Certifications */}
                    {skill.certifications && skill.certifications.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {skill.certifications.map((cert, certIndex) => (
                          <span
                            key={certIndex}
                            className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700"
                          >
                            {cert}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Skills Summary */}
      {skills.length > 0 && (
        <div className="rounded-lg border border-line bg-surface-100 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-ink-muted">
              Total Skills: {skills.length}
            </span>
            <span className="text-ink-muted">
              Categories:{' '}
              {new Set(skills.map((s) => s.category)).size}
            </span>
            <span className="text-ink-muted">
              Avg Experience:{' '}
              {(
                skills.reduce((sum, s) => sum + s.yearsOfExperience, 0) /
                skills.length
              ).toFixed(1)}{' '}
              years
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillsManager;
