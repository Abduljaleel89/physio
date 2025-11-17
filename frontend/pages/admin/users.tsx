import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../lib/auth';
import Layout from '../../components/Layout';
import { adminApi } from '../../lib/api';

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdUser, setCreatedUser] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [resettingPassword, setResettingPassword] = useState<number | null>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    role: 'PATIENT',
    firstName: '',
    lastName: '',
    regNumber: '',
    dateOfBirth: '',
    phone: '',
    address: '',
    licenseNumber: '',
    specialization: '',
  });

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    email: '',
    role: '',
    firstName: '',
    lastName: '',
    regNumber: '',
    dateOfBirth: '',
    phone: '',
    address: '',
    licenseNumber: '',
    specialization: '',
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/dashboard');
      return;
    }
    if (user) {
      loadUsers();
    }
  }, [user, authLoading, router]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.listUsers();
      if (response.success) {
        setUsers(response.data.users || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreatedUser(null);

    try {
      const userData: any = {
        email: formData.email,
        role: formData.role,
      };

      if (formData.role === 'PATIENT') {
        userData.firstName = formData.firstName;
        userData.lastName = formData.lastName;
        userData.regNumber = formData.regNumber;
        userData.dateOfBirth = formData.dateOfBirth;
        userData.phone = formData.phone || undefined;
        userData.address = formData.address || undefined;
      }

      if (formData.role === 'PHYSIOTHERAPIST') {
        userData.firstName = formData.firstName;
        userData.lastName = formData.lastName;
        userData.licenseNumber = formData.licenseNumber || undefined;
        userData.specialization = formData.specialization || undefined;
        userData.phone = formData.phone || undefined;
      }

      if (formData.role === 'RECEPTIONIST' || formData.role === 'ASSISTANT') {
        userData.firstName = formData.firstName;
        userData.lastName = formData.lastName;
      }

      const response = await adminApi.createUser(userData);
      if (response.success) {
        setSuccess('User created successfully!');
        setCreatedUser({
          email: response.data.user.email,
          password: response.data.password,
        });
        setFormData({
          email: '',
          role: 'PATIENT',
          firstName: '',
          lastName: '',
          regNumber: '',
          dateOfBirth: '',
          phone: '',
          address: '',
          licenseNumber: '',
          specialization: '',
        });
        loadUsers();
        setTimeout(() => setShowCreateForm(false), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleEdit = (userItem: any) => {
    setEditingUser(userItem);
    setEditFormData({
      email: userItem.email || '',
      role: userItem.role || '',
      firstName: userItem.patientProfile?.firstName || userItem.doctorProfile?.firstName || '',
      lastName: userItem.patientProfile?.lastName || userItem.doctorProfile?.lastName || '',
      regNumber: userItem.patientProfile?.regNumber || '',
      dateOfBirth: userItem.patientProfile?.dateOfBirth ? new Date(userItem.patientProfile.dateOfBirth).toISOString().split('T')[0] : '',
      phone: userItem.patientProfile?.phone || userItem.doctorProfile?.phone || '',
      address: userItem.patientProfile?.address || '',
      licenseNumber: userItem.doctorProfile?.licenseNumber || '',
      specialization: userItem.doctorProfile?.specialization || '',
    });
    setShowEditModal(true);
    setError('');
    setSuccess('');
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!editingUser) return;

    try {
      const updateData: any = {
        email: editFormData.email,
        role: editFormData.role,
      };

      if (editingUser.patientProfile) {
        updateData.firstName = editFormData.firstName;
        updateData.lastName = editFormData.lastName;
        updateData.regNumber = editFormData.regNumber;
        updateData.dateOfBirth = editFormData.dateOfBirth;
        updateData.phone = editFormData.phone || undefined;
        updateData.address = editFormData.address || undefined;
      }

      if (editingUser.doctorProfile) {
        updateData.firstName = editFormData.firstName;
        updateData.lastName = editFormData.lastName;
        updateData.licenseNumber = editFormData.licenseNumber || undefined;
        updateData.specialization = editFormData.specialization || undefined;
        updateData.phone = editFormData.phone || undefined;
      }

      const response = await adminApi.updateUser(editingUser.id, updateData);
      if (response.success) {
        setSuccess('User updated successfully!');
        setShowEditModal(false);
        setEditingUser(null);
        loadUsers();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user');
    }
  };

  const handleResetPassword = async (userId: number) => {
    if (!confirm('Are you sure you want to reset this user\'s password? A new password will be generated.')) {
      return;
    }

    setResettingPassword(userId);
    setError('');
    setSuccess('');
    setResetPasswordResult(null);

    try {
      const response = await adminApi.resetPassword(userId);
      if (response.success) {
        setResetPasswordResult({
          email: response.data.email,
          password: response.data.password,
        });
        setSuccess('Password reset successfully!');
        setTimeout(() => {
          setResetPasswordResult(null);
          setSuccess('');
        }, 10000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setResettingPassword(null);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <Layout>
      <div className="px-4 sm:px-0">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-50 mb-2">User Management</h1>
              <p className="text-gray-600 dark:text-gray-400">Create and manage users</p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn-primary"
            >
              {showCreateForm ? 'Cancel' : '+ Create User'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3 text-sm text-red-800 dark:text-red-300 font-medium">{error}</div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="ml-3 text-sm text-green-800 dark:text-green-300 font-medium">{success}</div>
            </div>
            {createdUser && (
              <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">User Credentials (save these!):</p>
                <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Email:</span> {createdUser.email}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Password:</span> <code className="bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded text-gray-900 dark:text-gray-50">{createdUser.password}</code></p>
              </div>
            )}
            {resetPasswordResult && (
              <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">New Password (save this!):</p>
                <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Email:</span> {resetPasswordResult.email}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">New Password:</span> <code className="bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded text-gray-900 dark:text-gray-50">{resetPasswordResult.password}</code></p>
              </div>
            )}
          </div>
        )}

        {showCreateForm && (
          <div className="mb-8 card">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-4">Create New User</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    className="input-field"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role *</label>
                  <select
                    required
                    className="input-field"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="PATIENT">Patient</option>
                    <option value="PHYSIOTHERAPIST">Physiotherapist</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="ASSISTANT">Assistant</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
                {formData.role === 'PATIENT' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Registration Number *</label>
                      <input
                        type="text"
                        required
                        className="input-field"
                        value={formData.regNumber}
                        onChange={(e) => setFormData({ ...formData, regNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth *</label>
                      <input
                        type="date"
                        required
                        className="input-field"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      />
                    </div>
                  </>
                )}
                {formData.role === 'PHYSIOTHERAPIST' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">License Number</label>
                      <input
                        type="text"
                        className="input-field"
                        value={formData.licenseNumber}
                        onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Specialization</label>
                      <input
                        type="text"
                        className="input-field"
                        value={formData.specialization}
                        onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    className="input-field"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                {formData.role === 'PATIENT' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Edit User</h2>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingUser(null);
                      setError('');
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <form onSubmit={handleUpdateUser} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                      <input
                        type="email"
                        required
                        className="input-field"
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role *</label>
                      <select
                        required
                        className="input-field"
                        value={editFormData.role}
                        onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                        disabled={editingUser.role === 'ADMIN'}
                      >
                        <option value="PATIENT">Patient</option>
                        <option value="PHYSIOTHERAPIST">Physiotherapist</option>
                        <option value="RECEPTIONIST">Receptionist</option>
                        <option value="ASSISTANT">Assistant</option>
                        {editingUser.role === 'ADMIN' && <option value="ADMIN">Admin</option>}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name *</label>
                      <input
                        type="text"
                        required
                        className="input-field"
                        value={editFormData.firstName}
                        onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name *</label>
                      <input
                        type="text"
                        required
                        className="input-field"
                        value={editFormData.lastName}
                        onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                      />
                    </div>
                    {editingUser.patientProfile && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Registration Number *</label>
                          <input
                            type="text"
                            required
                            className="input-field"
                            value={editFormData.regNumber}
                            onChange={(e) => setEditFormData({ ...editFormData, regNumber: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth *</label>
                          <input
                            type="date"
                            required
                            className="input-field"
                            value={editFormData.dateOfBirth}
                            onChange={(e) => setEditFormData({ ...editFormData, dateOfBirth: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                          <input
                            type="text"
                            className="input-field"
                            value={editFormData.address}
                            onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                          />
                        </div>
                      </>
                    )}
                    {editingUser.doctorProfile && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">License Number</label>
                          <input
                            type="text"
                            className="input-field"
                            value={editFormData.licenseNumber}
                            onChange={(e) => setEditFormData({ ...editFormData, licenseNumber: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Specialization</label>
                          <input
                            type="text"
                            className="input-field"
                            value={editFormData.specialization}
                            onChange={(e) => setEditFormData({ ...editFormData, specialization: e.target.value })}
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                      <input
                        type="tel"
                        className="input-field"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingUser(null);
                        setError('');
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                    >
                      Update User
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">All Users</h2>
          </div>
          {users.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">No users found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {users.map((userItem) => (
                <div key={userItem.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{userItem.email}</h3>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                          {userItem.role}
                        </span>
                      </div>
                      {userItem.patientProfile && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {userItem.patientProfile.firstName} {userItem.patientProfile.lastName} - Reg: {userItem.patientProfile.regNumber}
                        </p>
                      )}
                      {userItem.doctorProfile && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Dr. {userItem.doctorProfile.firstName} {userItem.doctorProfile.lastName}
                          {userItem.doctorProfile.specialization && ` - ${userItem.doctorProfile.specialization}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Created: {new Date(userItem.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(userItem)}
                          className="px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleResetPassword(userItem.id)}
                          disabled={resettingPassword === userItem.id}
                          className="px-3 py-1.5 text-sm font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {resettingPassword === userItem.id ? 'Resetting...' : 'Reset Password'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

