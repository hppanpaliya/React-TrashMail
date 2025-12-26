import React, { useEffect, useState } from "react";
import { Grid, Typography, Paper, Box, Tooltip, IconButton, TextField, MenuItem, Select, FormControl, InputLabel, InputAdornment, Pagination } from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ButtonSection from "../../common/ButtonSection";
import FiberNewOutlinedIcon from "@mui/icons-material/FiberNewOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import { SearchOutlined, ClearOutlined } from "@mui/icons-material";
import ConfirmModal from "../../common/ConfirmModal";
import { useAuth } from "../../../context/AuthContext";
import { env } from "../../../env";
import useWindowResize from "../../../hooks/useWindowResize";

const AllEmailList = () => {
  const [emailData, setEmailData] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(true);
  const isMobile = useWindowResize();
  const [emailToDelete, setEmailToDelete] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [reload, setReload] = useState(false);
  const { token } = useAuth();

  // Search, Filter, Sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRead, setFilterRead] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  
  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;



  const navigate = useNavigate();

  useEffect(() => {
    let eventSource;

    const fetchEmailData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${env.REACT_APP_API_URL}/api/all-emails?page=${page}&limit=${itemsPerPage}`, {
          headers: { 'x-auth-token': token }
        });
        setEmailData(response.data);
        
        // Get total pages from response headers
        const totalCountFromHeader = parseInt(response.headers['x-total-count']) || 0;
        const totalPagesFromHeader = parseInt(response.headers['x-total-pages']) || 1;
        setTotalPages(totalPagesFromHeader);
        setTotalCount(totalCountFromHeader);
        
        console.log('Pagination Info:', {
          currentPage: page,
          itemsPerPage,
          totalCount: totalCountFromHeader,
          totalPages: totalPagesFromHeader,
          emailsReturned: response.data.length,
          headers: response.headers
        });
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching email data:", error);
        setLoading(false);
      }
    };

    const setupSSE = () => {
      eventSource = new EventSource(`${env.REACT_APP_API_URL}/api/sse-all?token=${token}`);

      eventSource.onmessage = (event) => {
        const newEmail = JSON.parse(event.data);
        // Only add to current page if we're on page 1
        if (page === 1) {
          setEmailData((prevEmails) => [newEmail, ...prevEmails]);
          // Update total count
          setTotalCount((prevCount) => prevCount + 1);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE error:", error);
        eventSource.close();
        setTimeout(setupSSE, 5000); // Attempt to reconnect after 5 seconds
      };
    };

    if (token) {
      fetchEmailData();
      setupSSE();
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [reload, token, page, itemsPerPage]);

  const handleEmailClick = (email, email_Id) => {
    navigate(`/inbox/${email}/${email_Id}`);
  };

  const handleOpenModal = async () => {
    setOpenModal(true);
  };

  const handleDeleteEmail = async () => {
    try {
      await axios.delete(`${env.REACT_APP_API_URL}/api/email/${emailToDelete[1]}/${emailToDelete[0]}`, {
        headers: { 'x-auth-token': token }
      });
      // Refresh the email list after successful deletion
      setReload(!reload);
    } catch (error) {
      console.error("Error deleting email:", error);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterRead("all");
    setSortBy("date-desc");
  };

  const handlePageChange = (event, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter and sort emails
  const getFilteredAndSortedEmails = () => {
    let filtered = [...emailData];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((email) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          email.subject?.toLowerCase().includes(searchLower) ||
          email.from?.text?.toLowerCase().includes(searchLower) ||
          email.to?.value[0]?.address?.toLowerCase().includes(searchLower) ||
          email.text?.toLowerCase().includes(searchLower) ||
          email.html?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply read/unread filter
    if (filterRead === "read") {
      filtered = filtered.filter((email) => email.readStatus === true);
    } else if (filterRead === "unread") {
      filtered = filtered.filter((email) => email.readStatus === false || !email.readStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.date) - new Date(a.date);
        case "date-asc":
          return new Date(a.date) - new Date(b.date);
        case "subject-asc":
          return (a.subject || "").localeCompare(b.subject || "");
        case "subject-desc":
          return (b.subject || "").localeCompare(a.subject || "");
        case "from-asc":
          return (a.from?.text || "").localeCompare(b.from?.text || "");
        case "from-desc":
          return (b.from?.text || "").localeCompare(a.from?.text || "");
        case "to-asc":
          return (a.to?.value[0]?.address || "").localeCompare(b.to?.value[0]?.address || "");
        case "to-desc":
          return (b.to?.value[0]?.address || "").localeCompare(a.to?.value[0]?.address || "");
        default:
          return 0;
      }
    });

    return filtered;
  };

  const displayEmails = getFilteredAndSortedEmails();

  const handleNoEmails = () => {
    if (emailData.length === 0) {
      return (
        <Box sx={{ textAlign: "center", marginTop: "10vh" }}>
          <Paper elevation={3} sx={{ p: 2, marginBottom: 2, margin: isMobile ? "2vh" : "" }}>
            <Typography variant="p" gutterBottom>
              No Email Found
            </Typography>
          </Paper>
        </Box>
      );
    }
  };

  return (
    <>
      <Grid container spacing={2} sx={{ height: "100%" }}>
        <ButtonSection />
        <Grid item xs={12} md={1} sx={{ marginTop: isMobile ? "0vh" : "6vh" }}></Grid>
        <Grid item xs={12} md={8} sx={{ marginTop: isMobile ? "0vh" : "6vh" }}>
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              mb: 2
            }}
          >
            All Emails
          </Typography>

          {/* Search, Filter, Sort Controls */}
          <Box sx={{ mb: 3, px: { xs: 1, sm: 0 } }}>
            <Grid container spacing={2} alignItems="center">
              {/* Search */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchOutlined />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }
                  }}
                />
              </Grid>

              {/* Filter by Read Status */}
              <Grid item xs={6} sm={3} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Filter</InputLabel>
                  <Select
                    value={filterRead}
                    label="Filter"
                    onChange={(e) => setFilterRead(e.target.value)}
                    sx={{
                      '& .MuiSelect-select': {
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }
                    }}
                  >
                    <MenuItem value="all" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>All Emails</MenuItem>
                    <MenuItem value="read" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Read</MenuItem>
                    <MenuItem value="unread" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Unread</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Sort By */}
              <Grid item xs={6} sm={3} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    label="Sort By"
                    onChange={(e) => setSortBy(e.target.value)}
                    sx={{
                      '& .MuiSelect-select': {
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }
                    }}
                  >
                    <MenuItem value="date-desc" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Newest First</MenuItem>
                    <MenuItem value="date-asc" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Oldest First</MenuItem>
                    <MenuItem value="subject-asc" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Subject (A-Z)</MenuItem>
                    <MenuItem value="subject-desc" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Subject (Z-A)</MenuItem>
                    <MenuItem value="from-asc" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>From (A-Z)</MenuItem>
                    <MenuItem value="from-desc" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>From (Z-A)</MenuItem>
                    <MenuItem value="to-asc" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>To (A-Z)</MenuItem>
                    <MenuItem value="to-desc" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>To (Z-A)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Clear Filters */}
              <Grid item xs={12} sm={12} md={2}>
                <Tooltip title="Clear all filters">
                  <IconButton
                    onClick={handleClearFilters}
                    sx={{ 
                      width: '100%',
                      border: '1px solid',
                      borderColor: 'rgba(0,0,0,0.23)',
                      borderRadius: 1,
                      py: { xs: 0.5, sm: 1 }
                    }}
                  >
                    <ClearOutlined sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>

            {/* Results count */}
            <Typography variant="body2" sx={{ mt: 1, color: "#666", fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              Showing {displayEmails.length} of {totalCount} total emails (Page {page} of {totalPages})
            </Typography>
          </Box>

          {displayEmails.length > 0
            ? displayEmails.map((email) => (
                <Paper
                  elevation={3}
                  sx={{
                    p: { xs: 1.5, sm: 2 },
                    marginBottom: 2,
                    margin: isMobile ? "1vh" : "",
                    cursor: "pointer",
                  }}
                  key={email._id}
                  onClick={() => handleEmailClick(email.to.value[0].address, email._id)}
                >
                  <Typography
                    variant="h5"
                    gutterBottom
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      wordBreak: "break-word",
                      fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" },
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
                          setEmailToDelete([email._id, email.to.value[0].address]);
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
                        wordBreak: "break-word",
                        fontSize: { xs: "0.875rem", sm: "1rem" },
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
                        wordBreak: "break-word",
                        fontSize: { xs: "0.875rem", sm: "1rem" },
                      }}
                    >
                      To: {email.to.value[0].address}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        wordBreak: "break-word",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      }}
                    >
                      Date: {new Date(email.date).toLocaleString() + " EST"}
                    </Typography>
                  </Box>
                </Paper>
              ))
            : handleNoEmails()}
          
          {/* Pagination */}
          {displayEmails.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={handlePageChange}
                color="primary"
                size={isMobile ? "small" : "medium"}
                showFirstButton 
                showLastButton
              />
            </Box>
          )}
        </Grid>
      </Grid>
      <ConfirmModal
        open={openModal}
        setOpen={setOpenModal}
        title="Delete Email"
        body="Are you sure you want to delete this email?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => {
          handleDeleteEmail();
          setOpenModal(false);
        }}
        onCancel={() => setOpenModal(false)}
      />
    </>
  );
};

export default AllEmailList;
