import React, { useEffect, useState } from "react";

const RescueTimeConnect = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/rescuetime/data")
      .then((res) => res.json())
      .then((json) => setData(json.rows || []));
  }, []);

  return (
    <div className="p-4 bg-gray-100 rounded-lg shadow">
      <h2 className="text-lg font-bold">RescueTime Data</h2>
      <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export default RescueTimeConnect;
