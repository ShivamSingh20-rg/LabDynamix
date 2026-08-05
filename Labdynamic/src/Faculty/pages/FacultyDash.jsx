import react from 'react';

const FacultyDashboard = ({ user }) => {
  return (
    <div className="p-6 bg-[#0e1322] rounded-lg shadow-md text-gray-100">   
        <h1 className="text-2xl font-bold mb-4">Faculty Dashboard</h1>  
        <p className="text-gray-300">Welcome, {user?.name || 'Faculty Member'}!</p>
        <p className="text-gray-300">This is your dashboard where you can manage your bookings, view resources, and access other faculty-specific features.</p>
        {/* Add more faculty-specific content here */}
    </div>
  );
} 

export default FacultyDashboard;