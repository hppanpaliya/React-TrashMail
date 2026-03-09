jest.setTimeout(30000);
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.SMTP_PORT = process.env.SMTP_PORT || "2525";
process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION || "7.0.14";
process.env.MONGOMS_DISTRO = process.env.MONGOMS_DISTRO || "ubuntu-22.04";
