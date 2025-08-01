# Kubernetes MCP Server

## Overview

This project integrates a Kubernetes cluster with Cline through a Model Context Protocol (MCP) server. The MCP server provides a set of tools that allow Cline to interact with Kubernetes resources directly.

## What We've Accomplished

1. **Local Kubernetes Cluster Setup**
   - Installed and configured Minikube to run a single-node Kubernetes cluster
   - Set up the necessary dependencies (conntrack, cri-dockerd, CNI plugins)
   - Configured the cluster to be accessible from the user's environment

2. **Sample Application Deployment**
   - Deployed a sample nginx application with 2 replicas
   - Created a ClusterIP service to expose the nginx pods
   - Verified the deployment is running correctly

3. **MCP Server Integration**
   - Configured the Kubernetes MCP server to connect to the local cluster
   - Updated the necessary configuration files and certificates
   - Tested the integration by successfully listing resources

## MCP Server Capabilities

The Kubernetes MCP server provides the following capabilities:

### Cluster Information
- Get information about the current Kubernetes cluster

### Pod Management
- List pods in a namespace with optional label filtering
- Get detailed information about a specific pod
- Retrieve logs from a pod

### Service Management
- List services in a namespace with optional label filtering
- Get detailed information about a specific service

### Deployment Management
- List deployments in a namespace with optional label filtering
- Get detailed information about a specific deployment

### Node Management
- List all nodes in the cluster with optional label filtering
- Get detailed information about a specific node

### Namespace Management
- List all namespaces in the cluster

### ConfigMap Management
- List configmaps in a namespace with optional label filtering
- Get detailed information about a specific configmap

## Benefits

1. **Seamless Integration**: Interact with Kubernetes directly from Cline without switching contexts
2. **Simplified Workflow**: Use natural language to manage Kubernetes resources
3. **Enhanced Productivity**: Quickly retrieve information about your cluster and applications
4. **Safe Operations**: The MCP server is configured in read-only mode to prevent accidental changes

## Future Enhancements

Potential future enhancements for the Kubernetes MCP server include:

1. Adding support for more Kubernetes resource types (e.g., StatefulSets, DaemonSets)
2. Implementing write operations with proper safeguards
3. Adding support for multiple clusters
4. Implementing resource watching capabilities for real-time updates
