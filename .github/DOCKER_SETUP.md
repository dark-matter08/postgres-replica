# GitHub Actions Setup for Docker Hub

This repository includes a GitHub Actions workflow that automatically builds and pushes Docker images to Docker Hub.

## Required Secrets

To use this workflow, you need to set up the following secrets in your GitHub repository:

### 1. DOCKERHUB_USERNAME
Your Docker Hub username.

### 2. DOCKERHUB_TOKEN
A Docker Hub access token (not your password). To create one:

1. Go to [Docker Hub](https://hub.docker.com/)
2. Sign in to your account
3. Click on your username in the top right corner
4. Select "Account Settings"
5. Go to the "Security" tab
6. Click "New Access Token"
7. Give it a descriptive name (e.g., "GitHub Actions")
8. Copy the generated token

## Setting up GitHub Secrets

1. Go to your GitHub repository
2. Click on "Settings" tab
3. In the left sidebar, click "Secrets and variables" → "Actions"
4. Click "New repository secret"
5. Add both secrets:
   - Name: `DOCKERHUB_USERNAME`, Value: your Docker Hub username
   - Name: `DOCKERHUB_TOKEN`, Value: your Docker Hub access token

## Workflow Triggers

The workflow runs on:
- **Push to main/master/develop branches**: Builds and pushes with branch name as tag
- **Push tags starting with 'v'**: Builds and pushes with semantic version tags
- **Pull requests**: Builds only (doesn't push to registry)

## Image Tags

The workflow creates multiple tags:
- `latest`: For pushes to the default branch
- `<branch-name>`: For pushes to specific branches
- `v1.2.3`, `v1.2`, `v1`: For semantic version tags
- `pr-<number>`: For pull requests (build only)

## Multi-platform Builds

The workflow builds images for both:
- `linux/amd64` (Intel/AMD x64)
- `linux/arm64` (ARM 64-bit, including Apple Silicon)

## Docker Hub Repository

Your images will be available at:
```
docker.io/<your-username>/postgres-replica
```

## Usage Examples

After the workflow runs successfully, you can pull and use the image:

```bash
# Pull the latest image
docker pull <your-username>/postgres-replica:latest

# Pull a specific version
docker pull <your-username>/postgres-replica:v1.0.0

# Run the container
docker run --rm \
  -v ./replication-config.yml:/config/replication-config.yml:ro \
  -p 3001:3000 \
  <your-username>/postgres-replica:latest
```

## Troubleshooting

If the workflow fails:

1. **Authentication Error**: Check that your DOCKERHUB_USERNAME and DOCKERHUB_TOKEN secrets are correct
2. **Repository Not Found**: Make sure the repository exists on Docker Hub, or the workflow will create it automatically
3. **Permission Denied**: Ensure your Docker Hub token has write permissions
4. **Description Update Forbidden**: The README update step might fail if:
   - Your Docker Hub token doesn't have "Read, Write, Delete" permissions
   - The repository doesn't exist yet (create it manually first)
   - You're using a personal access token instead of the account password for the description update

### Docker Hub Token Permissions

When creating your Docker Hub access token, make sure to select:
- ✅ **Read, Write, Delete** permissions (required for pushing images and updating descriptions)

If you continue to have issues with the description update, you can:
1. Use the simple workflow (`docker-build-push-simple.yml`) which doesn't update descriptions
2. Manually update your Docker Hub repository description
3. Disable the description update step by commenting it out

### Alternative: Simple Workflow

If you prefer a workflow without the description update feature, use:
```yaml
# Rename docker-build-push-simple.yml to docker-build-push.yml
# This version only builds and pushes images without updating descriptions
```

## Security Notes

- Never commit Docker Hub credentials to your repository
- Use access tokens instead of passwords
- Consider using repository-specific tokens for better security
- Regularly rotate your access tokens
