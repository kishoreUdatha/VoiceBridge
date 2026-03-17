/**
 * Phone Numbers Page
 * Manage phone numbers for voice AI agents
 */

import { PlusIcon } from '@heroicons/react/24/outline';
import { usePhoneNumbers } from './hooks';
import {
  StatsCards,
  FiltersBar,
  PhoneNumbersTable,
  AddPhoneNumberModal,
  AssignAgentModal,
} from './components';

export default function PhoneNumbersPage() {
  const {
    phoneNumbers,
    stats,
    loading,
    agents,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    showAddModal,
    showAssignModal,
    selectedNumber,
    openAddModal,
    closeAddModal,
    openAssignModal,
    closeAssignModal,
    onAddSuccess,
    loadData,
    handleDelete,
    handleAssign,
    handleUnassign,
  } = usePhoneNumbers();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Phone Numbers</h1>
          <p className="text-slate-500">Manage phone numbers for your voice AI agents</p>
        </div>
        <button onClick={() => openAddModal()} className="btn btn-primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Phone Number
        </button>
      </div>

      {/* Stats Cards */}
      {stats && <StatsCards stats={stats} />}

      {/* Filters */}
      <FiltersBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        onRefresh={loadData}
      />

      {/* Phone Numbers Table */}
      <PhoneNumbersTable
        phoneNumbers={phoneNumbers}
        loading={loading}
        onEdit={openAddModal}
        onDelete={handleDelete}
        onAssign={openAssignModal}
        onUnassign={handleUnassign}
        onAddNew={() => openAddModal()}
      />

      {/* Add/Edit Modal */}
      {showAddModal && (
        <AddPhoneNumberModal
          phoneNumber={selectedNumber}
          onClose={closeAddModal}
          onSuccess={onAddSuccess}
        />
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedNumber && (
        <AssignAgentModal
          phoneNumber={selectedNumber}
          agents={agents}
          onClose={closeAssignModal}
          onAssign={handleAssign}
        />
      )}
    </div>
  );
}
