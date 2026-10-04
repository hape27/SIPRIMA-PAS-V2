# SIPRIMA-PAS LOCAL BROWSER — Prisma Recovery V7

This package restores `backend/prisma/schema.prisma` from the V6 source and fixes the Prisma enum syntax.

The previous broken edit used one-line enum declarations such as:

`enum SubmissionStatus { BELUM_MASUK DITERIMA VALID ... }`

Prisma requires enum values to be declared as individual enum members. V7 uses the valid multiline form.

## Recovery on Termux

From the `backend` directory, first verify the file:

```bash
sed -n '1,45p' prisma/schema.prisma
```

Then run:

```bash
npx prisma validate
```

If validation succeeds:

```bash
npx prisma generate
```

Do NOT recreate `schema.prisma` with `/tmp/header.prisma` or `/tmp/models.prisma`.

If `npx prisma validate` reports a new error, send the complete error block before editing the schema again.
