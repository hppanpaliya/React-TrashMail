import { Typography, Box, Grid, Button } from "@mui/material";
import Modal from "@mui/material/Modal";

// Generic Confirm Modal Component

const ConfirmModal = ({ open, setOpen, title, body, confirmText, cancelText, onConfirm, onCancel }) => {
  const backgroundColor = title.includes("Delete") ? "#f44336" : "#000"; // red for delete, black for others

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
          width: { xs: "90%", sm: 400 },
          maxWidth: "400px",
          bgcolor: "background.paper",
          border: "2px solid #000",
          boxShadow: 24,
          p: { xs: 2, sm: 4 },
        }}
      >
        <Typography
          id="modal-modal-title"
          variant="h6"
          component="h2"
          sx={{
            fontWeight: "bold",
            textAlign: "center",
            color: backgroundColor,
          }}
        >
          {title}
        </Typography>
        <Typography id="modal-modal-description" sx={{ mt: 2, textAlign: "center", color: backgroundColor }}>
          {body}
        </Typography>
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={6}>
            <Button
              fullWidth
              variant="outlined"
              onClick={onConfirm}
              sx={{
                "&:hover": {
                  backgroundColor: backgroundColor,
                  color: "#fff",
                  variant: "contained",
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
