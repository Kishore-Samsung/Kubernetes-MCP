# Kubernetes MCP Server Documentation

## Overview

This document provides information about the Kubernetes MCP (Model Context Protocol) server integration with Cline. The integration allows Cline to interact with a Kubernetes cluster through a set of tools provided by the MCP server.

## Setup Process

### Prerequisites

The following tools were installed as part of the setup:

1. **Minikube**: A tool that runs a single-node Kubernetes cluster locally
2. **kubectl**: The Kubernetes command-line tool
3. **conntrack**: A dependency for Minikube's "none" driver
4. **cri-dockerd**: A dependency for Minikube with Kubernetes v1.24+

### Installation Steps

1. **Install Minikube**:
   ```bash
   curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
   chmod +x minikube-linux-amd64
   sudo mv minikube-linux-amd64 /usr/local/bin/minikube
   ```

2. **Install kubectl**:
   ```bash
   curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
   chmod +x kubectl
   sudo mv kubectl /usr/local/bin/
   ```

3. **Install conntrack**:
   ```bash
   sudo apt-get update && sudo apt-get install -y conntrack
   ```

4. **Install cri-dockerd**:
   ```bash
   wget https://github.com/Mirantis/cri-dockerd/releases/download/v0.3.4/cri-dockerd_0.3.4.3-0.ubuntu-jammy_amd64.deb
   sudo dpkg -i cri-dockerd_0.3.4.3-0.ubuntu-jammy_amd64.deb
   ```

5. **Install CNI plugins**:
   ```bash
   CNI_VERSION="v1.3.0"
   sudo mkdir -p /opt/cni/bin
   curl -L "https://github.com/containernetworking/plugins/releases/download/${CNI_VERSION}/cni-plugins-linux-amd64-${CNI_VERSION}.tgz" | sudo tar -C /opt/cni/bin -xz
   ```

6. **Configure fs.protected_regular**:
   ```bash
   sudo sysctl fs.protected_regular=0
   ```

### Starting the Kubernetes Cluster

1. **Start Minikube**:
   ```bash
   sudo minikube start --driver=none
   ```

2. **Copy Kubernetes configuration to user's home directory**:
   ```bash
   mkdir -p $HOME/.minikube/profiles/minikube
   sudo cp /root/.minikube/profiles/minikube/client.crt /root/.minikube/profiles/minikube/client.key $HOME/.minikube/profiles/minikube/
   sudo cp /root/.minikube/ca.crt $HOME/.minikube/
   sudo cp /root/.kube/config $HOME/.kube/
   sudo chown -R $USER:$USER $HOME/.minikube $HOME/.kube
   ```

3. **Update kubeconfig file paths**:
   Update the paths in the kubeconfig file to point to the user's home directory instead of the root directory.

## Sample Application Deployment

A sample nginx application was deployed to the Kubernetes cluster:

1. **Create deployment and service manifest**:
   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: nginx-deployment
     namespace: default
   spec:
     replicas: 2
     selector:
       matchLabels:
         app: nginx
     template:
       metadata:
         labels:
           app: nginx
       spec:
         containers:
         - name: nginx
           image: nginx:latest
           ports:
           - containerPort: 80
   ---
   apiVersion: v1
   kind: Service
   metadata:
     name: nginx-service
     namespace: default
   spec:
     selector:
       app: nginx
     ports:
     - port: 80
       targetPort: 80
     type: ClusterIP
   ```

2. **Apply the manifest**:
   ```bash
   kubectl apply -f nginx-deployment.yaml
   ```

## Kubernetes MCP Server Configuration

The Kubernetes MCP server was configured to connect to the local Minikube cluster:

1. **Update the MCP server code**:
   ```typescript
   // Environment variables for Kubernetes configuration
   const KUBECONFIG_PATH = process.env.KUBECONFIG_PATH || '/home/test/.kube/config'; // Path to kubeconfig file
   const CONTEXT = process.env.KUBE_CONTEXT || 'minikube'; // Kubernetes context to use
   ```

2. **Configure MCP settings**:
   The MCP settings file (`cline_mcp_settings.json`) was updated to include the Kubernetes server:
   ```json
   {
     "mcpServers": {
       "kubernetes": {
         "command": "node",
         "args": ["/home/test/Documents/Cline/MCP/kubernetes-server/build/index.js"],
         "env": {
           "KUBECONFIG_PATH": "/home/test/.kube/config",
           "READ_ONLY": "true",
           "DISABLE_DESTRUCTIVE_OPERATIONS": "true"
         },
         "disabled": false,
         "autoApprove": []
       }
     }
   }
   ```

## Available MCP Tools

The Kubernetes MCP server provides the following tools:

1. **get_cluster_info**: Get information about the current Kubernetes cluster
   ```json
   {
     "namespace": "default"
   }
   ```

2. **list_pods**: List pods in a namespace
   ```json
   {
     "namespace": "default",
     "labelSelector": "app=nginx"
   }
   ```

3. **list_services**: List services in a namespace
   ```json
   {
     "namespace": "default",
     "labelSelector": "app=nginx"
   }
   ```

4. **list_deployments**: List deployments in a namespace
   ```json
   {
     "namespace": "default",
     "labelSelector": "app=nginx"
   }
   ```

5. **describe_pod**: Get detailed information about a pod
   ```json
   {
     "name": "nginx-deployment-96b9d695-gsf9h",
     "namespace": "default"
   }
   ```

6. **describe_service**: Get detailed information about a service
   ```json
   {
     "name": "nginx-service",
     "namespace": "default"
   }
   ```

7. **describe_deployment**: Get detailed information about a deployment
   ```json
   {
     "name": "nginx-deployment",
     "namespace": "default"
   }
   ```

8. **get_pod_logs**: Get logs from a pod
   ```json
   {
     "name": "nginx-deployment-96b9d695-gsf9h",
     "namespace": "default",
     "container": "nginx",
     "tailLines": 100
   }
   ```

9. **list_namespaces**: List all namespaces in the cluster
   ```json
   {}
   ```

10. **list_nodes**: List all nodes in the cluster
    ```json
    {
      "labelSelector": "kubernetes.io/role=master"
    }
    ```

11. **describe_node**: Get detailed information about a node
    ```json
    {
      "name": "sredsp"
    }
    ```

12. **list_configmaps**: List configmaps in a namespace
    ```json
    {
      "namespace": "default",
      "labelSelector": "app=nginx"
    }
    ```

13. **describe_configmap**: Get detailed information about a configmap
    ```json
    {
      "name": "my-configmap",
      "namespace": "default"
    }
    ```

## Usage Examples

### List Pods in the Default Namespace

```javascript
<use_mcp_tool>
<server_name>kubernetes</server_name>
<tool_name>list_pods</tool_name>
<arguments>
{
  "namespace": "default"
}
</arguments>
</use_mcp_tool>
```

Response:
```json
[
  {
    "name": "nginx-deployment-96b9d695-gsf9h",
    "namespace": "default",
    "status": "Running",
    "ip": "10.244.0.4",
    "node": "sredsp",
    "creationTimestamp": "2025-08-01T06:53:05.000Z"
  },
  {
    "name": "nginx-deployment-96b9d695-k789l",
    "namespace": "default",
    "status": "Running",
    "ip": "10.244.0.5",
    "node": "sredsp",
    "creationTimestamp": "2025-08-01T06:53:05.000Z"
  }
]
```

### List Services in the Default Namespace

```javascript
<use_mcp_tool>
<server_name>kubernetes</server_name>
<tool_name>list_services</tool_name>
<arguments>
{
  "namespace": "default"
}
</arguments>
</use_mcp_tool>
```

Response:
```json
[
  {
    "name": "kubernetes",
    "namespace": "default",
    "type": "ClusterIP",
    "clusterIP": "10.96.0.1",
    "ports": [
      {
        "name": "https",
        "port": 443,
        "protocol": "TCP",
        "targetPort": 8443
      }
    ],
    "creationTimestamp": "2025-08-01T06:49:42.000Z"
  },
  {
    "name": "nginx-service",
    "namespace": "default",
    "type": "ClusterIP",
    "clusterIP": "10.98.187.138",
    "ports": [
      {
        "port": 80,
        "protocol": "TCP",
        "targetPort": 80
      }
    ],
    "selector": {
      "app": "nginx"
    },
    "creationTimestamp": "2025-08-01T06:53:05.000Z"
  }
]
```

### List Deployments in the Default Namespace

```javascript
<use_mcp_tool>
<server_name>kubernetes</server_name>
<tool_name>list_deployments</tool_name>
<arguments>
{
  "namespace": "default"
}
</arguments>
</use_mcp_tool>
```

Response:
```json
[
  {
    "name": "nginx-deployment",
    "namespace": "default",
    "replicas": {
      "desired": 2,
      "available": 2,
      "ready": 2
    },
    "selector": {
      "matchLabels": {
        "app": "nginx"
      }
    },
    "creationTimestamp": "2025-08-01T06:53:05.000Z"
  }
]
```

## Troubleshooting

If you encounter issues with the Kubernetes MCP server, try the following:

1. **Check the Kubernetes cluster status**:
   ```bash
   kubectl get nodes
   kubectl get pods --all-namespaces
   ```

2. **Check the MCP server logs**:
   Look for error messages in the MCP server logs.

3. **Verify the kubeconfig file**:
   Ensure that the kubeconfig file is correctly configured and accessible.

4. **Restart the MCP server**:
   Rebuild and restart the MCP server to apply any changes.

## Conclusion

The Kubernetes MCP server integration with Cline provides a powerful way to interact with Kubernetes clusters directly from Cline. This enables you to manage your containerized applications more efficiently and effectively.
