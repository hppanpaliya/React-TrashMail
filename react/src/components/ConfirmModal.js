import React from "react";
import { Typography, Box, Grid, Button } from "@mui/material";
import Modal from "@mui/material/Modal";

const ConfirmModal = ({ open, setOpen, title, body, confirmText, cancelText, onConfirm, onCancel }) => {
  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          width: 400,
          bgcolor: "background.paper",
          border: "2px solid #000",
          boxShadow: 24,
          p: 4,
        }}
      >
        <Typography
          id="modal-modal-title"
          variant="h6"
          component="h2"
          sx={{
            fontWeight: "bold",
            textAlign: "center",
            color: title.includes("Delete") ? "#f44336" : "#000",
          }}
        >
          {title}
        </Typography>
        <Typography id="modal-modal-description" sx={{ mt: 2, textAlign: "center", color: "#000" }}>
          {body}
        </Typography>
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={6}>
            <Button
              fullWidth
              variant="contained"
              onClick={onConfirm}
              sx={{
                "&:hover": {
                  backgroundColor: title.includes("Delete") ? "#f44336" : "#000",
                  color: "#fff",
                },
              }}
            >
              {confirmText}
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button fullWidth variant="outlined" onClick={onCancel}>
              {cancelText}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Modal>
  );
};

export default ConfirmModal;
