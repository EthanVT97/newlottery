function login(username, password) {
    // ...existing code...
    const user = authenticateUser(username, password);
    if (user) {
        if (user.isAdmin) {
            return { success: true, isAdmin: true };
        }
        return { success: true, isAdmin: false };
    }
    return { success: false };
}
