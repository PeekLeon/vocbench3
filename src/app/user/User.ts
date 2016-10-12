export class User {
    private username: string;
    private roles: string[];

    constructor(username: string, roles: string[]) {
        this.username = username;
        this.roles = roles;
    }

    getUsername(): string {
        return this.username;
    }

    listRoles(): string[] {
        return this.roles;
    }

    hasRole(role: string): boolean {
        return this.roles.includes(role);
    }

}
