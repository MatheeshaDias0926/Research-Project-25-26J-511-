const BusCard = ({ bus }) => {
    return (
        <div className="p-4 border rounded-lg shadow-sm bg-white">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">{bus.deviceId}</h3>
                <span className={`px-2 py-1 rounded-full text-xs ${bus.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {bus.status}
                </span>
            </div>
            <p className="text-gray-500 text-sm mt-2">Driver: {bus.currentDriver}</p>
            {bus.lastIncident && (
                <div className="mt-4 p-2 bg-yellow-50 border-l-4 border-yellow-400">
                    <p className="text-xs font-bold text-yellow-700">LATEST INCIDENT</p>
                    <p className="text-sm">{bus.lastIncident.type}</p>
                    <a href={bus.lastIncident.videoUrl} target="_blank" className="text-blue-500 text-xs underline">
                        Watch Clip on Google Drive
                    </a>
                </div>
            )}
        </div>
    );
};