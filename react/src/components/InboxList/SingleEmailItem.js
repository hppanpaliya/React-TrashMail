import React, { useEffect, useRef, useState } from "react";
import { Paper, Typography, Box, Tooltip, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import FiberNewOutlinedIcon from "@mui/icons-material/FiberNewOutlined";
import { motion } from "framer-motion";

const SingleEmailItem = ({ email, handleEmailClick, handleOpenModal, setEmailToDelete, index, staggerDuration, isMobile }) => {
    const [isVisible, setIsVisible] = useState(false);
  const itemRef = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
      }
    );

    if (itemRef.current) {
      observer.observe(itemRef.current);
    }

    return () => {
      if (itemRef.current) {
        observer.unobserve(itemRef.current);
      }
    };
  }, []);
    
  return (
    <motion.div
      ref={itemRef}
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: isVisible ? 0.8 : 0, x: isVisible ? 0 : 100 }}
      transition={{
        type: "spring",
        stiffness: 50,
        damping: 9,
        delay: isVisible ? staggerDuration * index : 0,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 2,
          marginBottom: 2,
          margin: isMobile ? "2vh" : "",
          cursor: "pointer",
        }}
        key={email._id}
        onClick={() => handleEmailClick(email._id)}
      >
        <Typography
          variant="h5"
          gutterBottom
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            wordBreak: "break-all",
          }}
        >
          {email.subject}

          <Tooltip title="New">
            <IconButton
              aria-label="new"
              size="small"
              sx={{
                alignSelf: "flex-end",
                justifySelf: "flex-end",
                marginLeft: "auto",
              }}
            >
              {!email.readStatus ? <FiberNewOutlinedIcon /> : null}
            </IconButton>
          </Tooltip>

          <Tooltip title="Delete">
            <IconButton
              aria-label="delete"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setEmailToDelete(email._id);
                handleOpenModal();
              }}
              sx={{
                alignSelf: "flex-end",
                justifySelf: "flex-end",
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Typography>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Typography
            variant="subtitle1"
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              wordBreak: "break-all",
            }}
          >
            From: {email.from.text}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Typography
            variant="subtitle1"
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              wordBreak: "break-all",
            }}
          >
            Date: {new Date(email.date).toLocaleString() + " EST"}
          </Typography>
        </Box>
      </Paper>
    </motion.div>
  );
};

export default SingleEmailItem;
