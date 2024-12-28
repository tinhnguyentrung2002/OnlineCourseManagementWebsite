import React, { useEffect, useState } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false); 
  const [newCategoryTitle, setNewCategoryTitle] = useState(""); 

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const categoriesRef = collection(db, "Categories");
    const q = query(categoriesRef, orderBy("category_order"));
    const querySnapshot = await getDocs(q);
    const categoriesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCategories(categoriesData);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    const categoryRef = doc(db, "Categories", id);
    const sub = ["CategoriesChild"];
    await deleteDocumentWithSubcollections(categoryRef, sub);
    const remainingCategories = categories.filter(category => category.id !== id);
    remainingCategories.forEach(async (category, index) => {
      const categoryRef = doc(db, "Categories", category.id);
      await updateDoc(categoryRef, { category_order: index }); 
    });

    setCategories(remainingCategories);
  };

  const deleteSubcollectionDocs = async (docRef, subcollectionName) => {
    const subcollectionRef = collection(docRef, subcollectionName);
    const snapshot = await getDocs(subcollectionRef);
    const deletePromises = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
  };

  const deleteDocumentWithSubcollections = async (docRef, subcollectionNames) => {
    try {
      for (const subcollectionName of subcollectionNames) {
        await deleteSubcollectionDocs(docRef, subcollectionName);
      }
      await deleteDoc(docRef);
      console.log('Đã xóa tài liệu và tất cả các subcollection');
    } catch (error) {
      console.error('Lỗi khi xóa tài liệu hoặc subcollections:', error);
    }
  };

  const handleAddCategory = async () => {
    if (newCategoryTitle.trim() === "") return; 

    const newCategory = {
      category_id: "new-category-id",
      category_layer: 0,
      category_order: categories.length,
      category_title: newCategoryTitle,
    };

    const docRef = await addDoc(collection(db, "Categories"), newCategory);
    await updateDoc(docRef,{
        category_id: docRef.id
    })
    // const newCategoryData = { id: docRef.id, ...newCategory };

    const categoriesChildData = [
      { category_title: "Nâng cao", category_layer: 1, category_order: 0 },
      { category_title: "Cơ bản", category_layer: 1, category_order: 1 },
      { category_title: "Ôn thi", category_layer: 1, category_order: 2 },
    ];

    categoriesChildData.forEach(async (childData) => {
      const childRef =  await addDoc(collection(db, "Categories", docRef.id, "CategoriesChild"), childData)
      await updateDoc(childRef,{
        category_id:childRef.id
      });
    });

    fetchCategories()
    handleClose();
  };

  const handleDragEnd = async (result) => {
    const { destination, source } = result;

    if (!destination || destination.index === source.index) return;

    const reorderedCategories = [...categories];
    const [removed] = reorderedCategories.splice(source.index, 1);
    reorderedCategories.splice(destination.index, 0, removed);

    reorderedCategories.forEach(async (category, index) => {
      const categoryRef = doc(db, "Categories", category.id);
      await updateDoc(categoryRef, { category_order: index });
    });
    setCategories(reorderedCategories);
    // fetchCategories()
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setNewCategoryTitle("");
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Button
        variant="contained"
        color="primary"
        onClick={handleOpen} 
        sx={{ marginBottom: 2 }}
      >
        Thêm Thể loại
      </Button>

      {loading ? (
        <Typography variant="h6">Đang tải...</Typography>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="categoriesList">
            {(provided) => (
              <TableContainer component={Paper} {...provided.droppableProps} ref={provided.innerRef}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tiêu đề thể loại</TableCell>
                      <TableCell>Vị trí sắp xếp</TableCell>
                      <TableCell>Thao tác</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categories.map((category, index) => (
                      <Draggable key={category.id} draggableId={category.id} index={index}>
                        {(provided) => (
                          <TableRow
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            sx={{
                              height: "56px",
                            }}
                          >
                            <TableCell>{category.category_title}</TableCell>
                            <TableCell>{index}</TableCell>
                            <TableCell>
                              {["grade10", "grade11", "grade12"].includes(category.category_id) ? (
                                <Button variant="outlined" color="default" disabled>
                                  Không thể xóa
                                </Button>
                            
                              ) : (
                                <Button
                                  variant="outlined"
                                  color="secondary"
                                  onClick={() => handleDelete(category.id)}
                                >
                                  Xóa
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder} 
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Droppable>
        </DragDropContext>
      )}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Thêm Thể loại</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="category-title"
            label="Tiêu đề thể loại"
            type="text"
            fullWidth
            value={newCategoryTitle}
            onChange={(e) => setNewCategoryTitle(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">Hủy</Button>
          <Button onClick={handleAddCategory} color="primary">Xác nhận</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CategoryManagement;
