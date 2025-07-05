import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  TextField,
  InputAdornment,
  Snackbar,
  Alert as MUIAlert,
  Paper,
  Toolbar,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { DataGrid, GridColDef, GridRowsProp, GridRowSelectionModel } from '@mui/x-data-grid';
import {
  Add,
  Refresh,
  MoreVert,
  Search,
  PersonAdd,
  Edit,
  Delete,
  Lock,
  CloudUpload,
  CheckCircle,
  Error as ErrorIcon,
  PersonOff,
  Person,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { usersApi } from '../services/api';
import { User, UserRole, UsersListResponse, RoleOption, CreateUserRequest, UpdateUserRequest, ChangePasswordRequest, ImportUsersRequest, ImportUsersResponse } from '../types/user.types';
import UserDialog from '../components/UserDialog';
import ChangePasswordDialog from '../components/ChangePasswordDialog';
import ImportUsersDialog from '../components/ImportUsersDialog';

const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [activeFilter, setActiveFilter] = useState<boolean | ''>('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<GridRowSelectionModel>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Dialog states
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordChangeUser, setPasswordChangeUser] = useState<User | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Menu state for actions
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: page + 1, // Backend expects 1-based pagination
        limit: pageSize,
        ...(searchQuery && { search: searchQuery }),
        ...(roleFilter && { role: roleFilter }),
        ...(activeFilter !== '' && { isActive: activeFilter }),
      };

      const response = await usersApi.list(params);
      const data: UsersListResponse = response.data;
      
      setUsers(data.users);
      setTotalUsers(data.total);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError('ユーザー一覧の取得に失敗しました');
      setSnackbar({
        open: true,
        message: 'ユーザー一覧の取得に失敗しました',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, roleFilter, activeFilter]);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await usersApi.getRoles();
      setRoles(response.data);
    } catch (err: any) {
      console.error('Failed to fetch roles:', err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleRefresh = () => {
    fetchUsers();
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(0); // Reset to first page when searching
  };

  const handleRoleFilterChange = (event: SelectChangeEvent) => {
    setRoleFilter(event.target.value as UserRole | '');
    setPage(0);
  };

  const handleActiveFilterChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    setActiveFilter(value === '' ? '' : value === 'true');
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  const handleToggleActive = async (user: User) => {
    try {
      await usersApi.toggleActive(user.id);
      setSnackbar({
        open: true,
        message: `${user.username}のアクティブ状態を変更しました`,
        severity: 'success',
      });
      fetchUsers();
    } catch (err: any) {
      console.error('Failed to toggle user active status:', err);
      setSnackbar({
        open: true,
        message: 'ユーザー状態の変更に失敗しました',
        severity: 'error',
      });
    }
    handleMenuClose();
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setUserDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserDialogOpen(true);
    handleMenuClose();
  };

  const handleChangePassword = (user: User) => {
    setPasswordChangeUser(user);
    setPasswordDialogOpen(true);
    handleMenuClose();
  };

  const handleSaveUser = async (userData: CreateUserRequest | UpdateUserRequest) => {
    try {
      if (editingUser) {
        // Edit mode
        await usersApi.update(editingUser.id, userData as UpdateUserRequest);
        setSnackbar({
          open: true,
          message: `${editingUser.username}を更新しました`,
          severity: 'success',
        });
      } else {
        // Create mode
        await usersApi.create(userData as CreateUserRequest);
        setSnackbar({
          open: true,
          message: '新しいユーザーを作成しました',
          severity: 'success',
        });
      }
      fetchUsers();
    } catch (err: any) {
      console.error('Failed to save user:', err);
      setSnackbar({
        open: true,
        message: editingUser ? 'ユーザーの更新に失敗しました' : 'ユーザーの作成に失敗しました',
        severity: 'error',
      });
      throw err; // Re-throw to be handled by dialog
    }
  };

  const handleSavePassword = async (passwordData: ChangePasswordRequest) => {
    if (!passwordChangeUser) return;

    try {
      await usersApi.changePassword(passwordChangeUser.id, passwordData);
      setSnackbar({
        open: true,
        message: `${passwordChangeUser.username}のパスワードを変更しました`,
        severity: 'success',
      });
    } catch (err: any) {
      console.error('Failed to change password:', err);
      setSnackbar({
        open: true,
        message: 'パスワードの変更に失敗しました',
        severity: 'error',
      });
      throw err; // Re-throw to be handled by dialog
    }
  };

  const handleImportUsers = async (importData: ImportUsersRequest): Promise<ImportUsersResponse> => {
    try {
      const response = await usersApi.import(importData);
      const result: ImportUsersResponse = response.data;
      
      setSnackbar({
        open: true,
        message: `インポートが完了しました。成功: ${result.success}件、失敗: ${result.failed}件`,
        severity: result.failed === 0 ? 'success' : 'warning',
      });
      
      fetchUsers(); // Refresh the user list
      return result;
    } catch (err: any) {
      console.error('Failed to import users:', err);
      setSnackbar({
        open: true,
        message: 'ユーザーのインポートに失敗しました',
        severity: 'error',
      });
      throw err;
    }
  };


  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await usersApi.delete(userToDelete.id);
      setSnackbar({
        open: true,
        message: `${userToDelete.username}を削除しました`,
        severity: 'success',
      });
      fetchUsers();
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      setSnackbar({
        open: true,
        message: 'ユーザーの削除に失敗しました',
        severity: 'error',
      });
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const getRoleLabel = (role: UserRole): string => {
    const roleOption = roles.find(r => r.value === role);
    return roleOption?.label || role;
  };

  const getStatusChip = (user: User) => {
    if (user.isActive) {
      return <Chip label="アクティブ" color="success" size="small" icon={<CheckCircle />} />;
    } else {
      return <Chip label="非アクティブ" color="default" size="small" icon={<PersonOff />} />;
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'username',
      headerName: 'ユーザー名',
      width: 150,
      sortable: true,
    },
    {
      field: 'email',
      headerName: 'メールアドレス',
      width: 200,
      sortable: true,
    },
    {
      field: 'role',
      headerName: 'ロール',
      width: 120,
      sortable: true,
      renderCell: (params) => (
        <Chip 
          label={getRoleLabel(params.value)} 
          variant="outlined" 
          size="small"
          color={params.value === UserRole.ADMIN ? 'error' : params.value === UserRole.EDITOR ? 'warning' : 'default'}
        />
      ),
    },
    {
      field: 'isActive',
      headerName: 'ステータス',
      width: 120,
      sortable: true,
      renderCell: (params) => getStatusChip(params.row),
    },
    {
      field: 'lastLoginAt',
      headerName: '最終ログイン',
      width: 160,
      sortable: true,
      renderCell: (params) => {
        if (!params.value) return '未ログイン';
        return new Date(params.value).toLocaleString('ja-JP');
      },
    },
    {
      field: 'createdAt',
      headerName: '作成日',
      width: 160,
      sortable: true,
      renderCell: (params) => new Date(params.value).toLocaleString('ja-JP'),
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          size="small"
          onClick={(event) => handleMenuOpen(event, params.row)}
          disabled={params.row.id === currentUser?.id} // Cannot perform actions on self
        >
          <MoreVert />
        </IconButton>
      ),
    },
  ];

  const rows: GridRowsProp = users.map((user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  }));

  if (!currentUser || currentUser.role !== UserRole.ADMIN) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          この機能は管理者のみ利用できます。
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          ユーザー管理
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading}
          >
            更新
          </Button>
          <Button
            variant="outlined"
            startIcon={<CloudUpload />}
            onClick={() => setImportDialogOpen(true)}
            disabled={loading}
          >
            一括インポート
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateUser}
          >
            新規ユーザー
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            フィルター
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              label="検索"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="ユーザー名、メールアドレスで検索"
              size="small"
              sx={{ minWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>ロール</InputLabel>
              <Select
                value={roleFilter}
                label="ロール"
                onChange={handleRoleFilterChange}
              >
                <MenuItem value="">すべて</MenuItem>
                {roles.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>ステータス</InputLabel>
              <Select
                value={activeFilter === '' ? '' : activeFilter.toString()}
                label="ステータス"
                onChange={handleActiveFilterChange}
              >
                <MenuItem value="">すべて</MenuItem>
                <MenuItem value="true">アクティブ</MenuItem>
                <MenuItem value="false">非アクティブ</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Data Grid */}
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          paginationMode="server"
          rowCount={totalUsers}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          rowsPerPageOptions={[5, 10, 25, 50]}
          loading={loading}
          checkboxSelection
          onRowSelectionModelChange={setSelectedUsers}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell': {
              alignItems: 'center',
            },
          }}
        />
      </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedUser && handleEditUser(selectedUser)}>
          <Edit sx={{ mr: 1 }} />
          編集
        </MenuItem>
        <MenuItem onClick={() => selectedUser && handleChangePassword(selectedUser)}>
          <Lock sx={{ mr: 1 }} />
          パスワード変更
        </MenuItem>
        <MenuItem onClick={() => selectedUser && handleToggleActive(selectedUser)}>
          {selectedUser?.isActive ? <PersonOff sx={{ mr: 1 }} /> : <Person sx={{ mr: 1 }} />}
          {selectedUser?.isActive ? '非アクティブ化' : 'アクティブ化'}
        </MenuItem>
        <MenuItem onClick={() => selectedUser && handleDeleteUser(selectedUser)} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} />
          削除
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>ユーザー削除の確認</DialogTitle>
        <DialogContent>
          {userToDelete && (
            <Typography>
              ユーザー「{userToDelete.username}」を削除してもよろしいですか？
              この操作は取り消せません。
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={confirmDeleteUser} color="error" variant="contained">
            削除
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <MUIAlert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </MUIAlert>
      </Snackbar>

      {/* User Create/Edit Dialog */}
      <UserDialog
        open={userDialogOpen}
        onClose={() => setUserDialogOpen(false)}
        onSave={handleSaveUser}
        user={editingUser}
        roles={roles}
        loading={loading}
      />

      {/* Password Change Dialog */}
      <ChangePasswordDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
        onSave={handleSavePassword}
        user={passwordChangeUser}
        loading={loading}
      />

      {/* Import Users Dialog */}
      <ImportUsersDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={handleImportUsers}
        roles={roles}
        loading={loading}
      />


      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Container>
  );
};

export default UsersPage;