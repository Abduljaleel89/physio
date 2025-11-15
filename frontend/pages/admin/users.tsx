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
              <h1 className="text-4xl font-bold text-gray-900 mb-2">User Management</h1>
              <p className="text-gray-600">Create and manage users</p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showCreateForm ? 'Cancel' : '+ Create User'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3 text-sm text-red-700">{error}</div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="ml-3 text-sm text-green-700">{success}</div>
            </div>
            {createdUser && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                <p className="text-sm font-semibold text-gray-900 mb-2">User Credentials (save these!):</p>
                <p className="text-sm text-gray-700"><span className="font-medium">Email:</span> {createdUser.email}</p>
                <p className="text-sm text-gray-700"><span className="font-medium">Password:</span> <code className="bg-gray-100 px-2 py-1 rounded">{createdUser.password}</code></p>
              </div>
            )}
          </div>
        )}

        {showCreateForm && (
          <div className="mb-8 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New User</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
                {formData.role === 'PATIENT' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number *</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formData.regNumber}
                        onChange={(e) => setFormData({ ...formData, regNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                      <input
                        type="date"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      />
                    </div>
                  </>
                )}
                {formData.role === 'PHYSIOTHERAPIST' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formData.licenseNumber}
                        onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formData.specialization}
                        onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                {formData.role === 'PATIENT' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">All Users</h2>
          </div>
          {users.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {users.map((userItem) => (
                <div key={userItem.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{userItem.email}</h3>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {userItem.role}
                        </span>
                      </div>
                      {userItem.patientProfile && (
                        <p className="text-sm text-gray-600">
                          {userItem.patientProfile.firstName} {userItem.patientProfile.lastName} - Reg: {userItem.patientProfile.regNumber}
                        </p>
                      )}
                      {userItem.doctorProfile && (
                        <p className="text-sm text-gray-600">
                          Dr. {userItem.doctorProfile.firstName} {userItem.doctorProfile.lastName}
                          {userItem.doctorProfile.specialization && ` - ${userItem.doctorProfile.specialization}`}
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      Created: {new Date(userItem.createdAt).toLocaleDateString()}
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

