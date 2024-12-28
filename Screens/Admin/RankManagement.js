import React, { useState, useEffect } from "react";
import { db } from "../../firebase"; 
import { collection, query, getDocs, where, doc, getDoc } from "firebase/firestore";
import { DataGrid } from "@mui/x-data-grid";
import { Button } from "@mui/material";
import { utils, writeFile } from "xlsx";

const RankManagement = () => {
  const [ranks, setRanks] = useState([]);
  const [loading, setLoading] = useState(true);


  const fetchRanks = async () => {
    try {
      setLoading(true);
      const ranksRef = collection(db, "Rank");
      const ranksQuery = query(ranksRef, where("rank_position", ">=", 0));
      const querySnapshot = await getDocs(ranksQuery);
      
      const ranksData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const userIds = ranksData.map((rank) => rank.rank_user_id);
      const usersData = {};

      for (let userId of userIds) {
        const userRef = doc(db, "Users", userId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const user = userDoc.data();
          usersData[userId] = {
            user_name: user.user_name,
            user_avatar: user.user_avatar,
            user_email: user.user_email,
            user_uid: user.user_uid
          };
        }
      }

      const ranksWithUserData = ranksData.map((rank) => ({
        ...rank,
        user_name: usersData[rank.rank_user_id]?.user_name || "Unknown",
        user_avatar: usersData[rank.rank_user_id]?.user_avatar || "/default-avatar.png",
        user_email: usersData[rank.rank_user_id]?.user_email || "Unknown",
        user_uid: usersData[rank.rank_user_id]?.user_uid || "Unknown"
      }));

      setRanks(ranksWithUserData); 
    } catch (error) {
      console.error("Error fetching ranks or users: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanks();
  }, []);

  const columns = [
    {
      field: "user_avatar",
      headerName: "Ảnh đại diện",
      width: 100,
      renderCell: (params) => (
        <img
          src={params.row.user_avatar}
          alt={params.row.user_name}
          style={{ width: "40px", height: "40px", borderRadius: "50%" }}
        />
      ),
    },
    { field: "user_name", headerName: "Tên người dùng", width: 200 },
    { field: "user_email", headerName: "Email", width: 250 },
    { field: "user_uid", headerName: "UID", width: 250 },
    { field: "rank_position", headerName: "Xếp hạng", width: 150 },
    { field: "rank_user_points", headerName: "Điểm", width: 150 },
  ];
  const exportToExcel = (data) => {
    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Ranking");
    writeFile(workbook, "DanhSachXepHang.xlsx");
  };
  return (
    <div>
      <div style={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={ranks} 
          columns={columns}
          pageSize={5}
          loading={loading}
          disableSelectionOnClick
          rowsPerPageOptions={[5, 10, 25]}
        />
      </div>
      <Button variant="contained" style={{marginTop:5}} color="secondary" onClick={() => exportToExcel(ranks)}>
        Xuất Excel
      </Button>
    </div>
  );
};

export default RankManagement;
