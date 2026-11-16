# Security and Encryption Guide

Authoritative instructions for how the database **content** backup under `database/encrypted-backups/` is (or will be) encrypted, and the rules that govern every secret touched by this backup branch. This is the document the manual's §7.2 and §7.4 point to.

## The rule this entire guide exists to enforce

**No real secret — database password, API key, session secret, or the encryption passphrase itself — is ever committed to this repository, written into this manual, or placed in any file in this backup.** This branch backs up source code, schema structure, and (once provided) encrypted database content. It does not and must not back up plaintext credentials. Real values live only in the production host's own environment-variable store; see `documentation/ENVIRONMENT_VARIABLES_REFERENCE.md` for variable names and where to go get a real value for each.

## Why database content needs encryption at all

Per the manual §1.5, uploaded file bytes live inside the database (`media` table, `LONGBLOB` column) — there is no separate "uploads" backup. A database content export therefore contains everything: admin and student personal data, leads, pricing records, and every uploaded file. It must never sit in a Git repository, even a private one, unencrypted.

## Tooling

Both `age` and `gpg` are suitable; `age` is recommended for a passphrase-based (symmetric) backup because its command line is simpler and less error-prone than GPG's. This guide shows both.

### Encrypting a database dump with `age` (recommended)

```bash
# 1. Produce the raw SQL dump (see DATABASE_RESTORATION_GUIDE.md's companion export step)
mysqldump --single-transaction --routines --triggers \
  -h <host> -u <user> -p <admin_db_name> > admin-core.sql
mysqldump --single-transaction --routines --triggers \
  -h <host> -u <user> -p <learn_db_name> > learn-core.sql

# 2. Encrypt each dump with a passphrase (age will prompt for it interactively — never pass
#    it on the command line, where it would land in shell history)
age -p -o admin-core.sql.age admin-core.sql
age -p -o learn-core.sql.age learn-core.sql

# 3. Confirm the encrypted files are unreadable without the passphrase, then delete the
#    plaintext dumps — never leave a plaintext copy anywhere, including this machine
age -d admin-core.sql.age | head -c 100     # should prompt for the passphrase and show real SQL
shred -u admin-core.sql learn-core.sql       # or: rm -P, or move to an encrypted volume and delete
```

### Decrypting during a restoration

```bash
age -d -o admin-core.sql admin-core.sql.age    # prompts for the passphrase
age -d -o learn-core.sql learn-core.sql.age
mysql -h <new-host> -u <admin-user> -p <new_admin_db_name> < admin-core.sql
mysql -h <new-host> -u <admin-user> -p <new_learn_db_name> < learn-core.sql
shred -u admin-core.sql learn-core.sql         # delete the plaintext again once imported
```

### Alternative: GPG symmetric encryption

```bash
gpg --symmetric --cipher-algo AES256 -o admin-core.sql.gpg admin-core.sql
gpg --decrypt -o admin-core.sql admin-core.sql.gpg
```

## Passphrase handling rules

- The passphrase is agreed between the repository owner and whoever performs the export — out of band, never inside this repository, never inside a commit message, never inside this document, and never inside an AI assistant's chat transcript if that transcript itself is stored or logged anywhere persistent.
- Treat the passphrase with the same care as a root database password. If it is ever typed into a chat, a ticket, or a log by mistake, rotate it: re-encrypt the backup with a new passphrase at the next opportunity.
- There is no passphrase recovery mechanism by design. Losing it means losing access to that specific encrypted archive — keep it recorded somewhere durable and access-controlled outside this repository (a password manager, not a text file on the same machine as the backup).

## What's actually encrypted in this backup, as of this branch's current state

See `documentation/BACKUP_VERIFICATION_REPORT.md` for the live status — whether `database/encrypted-backups/` currently contains a real encrypted archive, or is still pending an export from the production database owner.

## Recommended ongoing practice (not yet automated)

Per the manual §9: a **daily** automated database export is the realistic minimum once a working export mechanism exists; weekly is a bare minimum, not a target. No credential-rotation schedule currently exists for any secret in this project — rotate session secrets and any broadly-scoped API key (notably the GitHub token used by the admin "publish" feature, which can write to this repository's source) on a defined schedule or immediately on suspected exposure.
