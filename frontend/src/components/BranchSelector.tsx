import { useEffect, Fragment } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Listbox, Transition } from '@headlessui/react';
import { BuildingOffice2Icon, ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { AppDispatch, RootState } from '../store';
import { fetchBranches, setSelectedBranch } from '../store/slices/branchSlice';

interface BranchSelectorProps {
  variant?: 'default' | 'compact';
  className?: string;
}

export default function BranchSelector({ variant = 'default', className = '' }: BranchSelectorProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { branches, selectedBranchId, isLoading } = useSelector((state: RootState) => state.branches);

  // Only show for admin users
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    if (isAdmin && branches.length === 0) {
      dispatch(fetchBranches(true)); // Fetch only active branches
    }
  }, [dispatch, isAdmin, branches.length]);

  // Don't render if not admin
  if (!isAdmin) {
    return null;
  }

  const selectedBranch = selectedBranchId
    ? branches.find(b => b.id === selectedBranchId)
    : null;

  const handleChange = (branchId: string | null) => {
    dispatch(setSelectedBranch(branchId));
  };

  if (variant === 'compact') {
    return (
      <Listbox value={selectedBranchId} onChange={handleChange}>
        <div className={`relative ${className}`}>
          <Listbox.Button className="relative flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm transition-colors">
            <BuildingOffice2Icon className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline max-w-[100px] truncate">
              {selectedBranch ? selectedBranch.name : 'All Branches'}
            </span>
            <ChevronUpDownIcon className="h-4 w-4 text-slate-400" />
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute right-0 z-50 mt-1 w-56 max-h-60 overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <Listbox.Option
                value={null}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                    active ? 'bg-primary-50 text-primary-900' : 'text-slate-900'
                  }`
                }
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                      All Branches
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600">
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </Listbox.Option>
              {branches.map((branch) => (
                <Listbox.Option
                  key={branch.id}
                  value={branch.id}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                      active ? 'bg-primary-50 text-primary-900' : 'text-slate-900'
                    }`
                  }
                >
                  {({ selected }) => (
                    <>
                      <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                        {branch.name}
                        {branch.isHeadquarters && (
                          <span className="ml-1 text-xs text-slate-500">(HQ)</span>
                        )}
                      </span>
                      <span className="block text-xs text-slate-500 truncate">
                        {branch.city}, {branch.state}
                      </span>
                      {selected && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      )}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    );
  }

  // Default variant
  return (
    <Listbox value={selectedBranchId} onChange={handleChange}>
      <div className={`relative ${className}`}>
        <Listbox.Label className="block text-sm font-medium text-slate-700 mb-1">
          Filter by Branch
        </Listbox.Label>
        <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white py-2 pl-3 pr-10 text-left border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
          <span className="flex items-center gap-2">
            <BuildingOffice2Icon className="h-5 w-5 text-slate-400" />
            <span className="block truncate">
              {isLoading ? 'Loading...' : selectedBranch ? selectedBranch.name : 'All Branches'}
            </span>
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </span>
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            <Listbox.Option
              value={null}
              className={({ active }) =>
                `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                  active ? 'bg-primary-50 text-primary-900' : 'text-slate-900'
                }`
              }
            >
              {({ selected }) => (
                <>
                  <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                    All Branches
                  </span>
                  {selected && (
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600">
                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  )}
                </>
              )}
            </Listbox.Option>
            {branches.map((branch) => (
              <Listbox.Option
                key={branch.id}
                value={branch.id}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                    active ? 'bg-primary-50 text-primary-900' : 'text-slate-900'
                  }`
                }
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                      {branch.name}
                      {branch.isHeadquarters && (
                        <span className="ml-1 text-xs text-slate-500">(HQ)</span>
                      )}
                    </span>
                    <span className="block text-xs text-slate-500 truncate">
                      {branch.city}, {branch.state}
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600">
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}
