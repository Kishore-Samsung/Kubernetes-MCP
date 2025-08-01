#!/usr/bin/env node
// @ts-nocheck - Disable TypeScript checking for this file
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import * as k8s from '@kubernetes/client-node';

// We'll use 'any' type for now to avoid TypeScript errors
// with the Kubernetes client library

// Environment variables for Kubernetes configuration
const KUBECONFIG_PATH = process.env.KUBECONFIG_PATH || '/home/test/.kube/config'; // Path to kubeconfig file
const CONTEXT = process.env.KUBE_CONTEXT || 'minikube'; // Kubernetes context to use

class KubernetesServer {
  private server: Server;
  private k8sApi: {
    core: k8s.CoreV1Api;
    apps: k8s.AppsV1Api;
    batch: k8s.BatchV1Api;
    networking: k8s.NetworkingV1Api;
  };
  private kc: k8s.KubeConfig;

  constructor() {
    this.server = new Server(
      {
        name: 'kubernetes-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize Kubernetes client
    this.kc = new k8s.KubeConfig();
    
    // Load from default location or from specified path
    if (KUBECONFIG_PATH) {
      this.kc.loadFromFile(KUBECONFIG_PATH);
    } else {
      this.kc.loadFromDefault();
    }
    
    // Use specified context if provided
    if (CONTEXT) {
      this.kc.setCurrentContext(CONTEXT);
    }
    
    // Initialize API clients
    this.k8sApi = {
      core: this.kc.makeApiClient(k8s.CoreV1Api),
      apps: this.kc.makeApiClient(k8s.AppsV1Api),
      batch: this.kc.makeApiClient(k8s.BatchV1Api),
      networking: this.kc.makeApiClient(k8s.NetworkingV1Api),
    };

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_cluster_info',
          description: 'Get information about the current Kubernetes cluster',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'list_pods',
          description: 'List pods in a namespace',
          inputSchema: {
            type: 'object',
            properties: {
              namespace: {
                type: 'string',
                description: 'Kubernetes namespace (default: "default")',
              },
              labelSelector: {
                type: 'string',
                description: 'Label selector to filter pods (e.g. "app=nginx")',
              },
            },
            required: [],
          },
        },
        {
          name: 'list_services',
          description: 'List services in a namespace',
          inputSchema: {
            type: 'object',
            properties: {
              namespace: {
                type: 'string',
                description: 'Kubernetes namespace (default: "default")',
              },
              labelSelector: {
                type: 'string',
                description: 'Label selector to filter services (e.g. "app=nginx")',
              },
            },
            required: [],
          },
        },
        {
          name: 'list_deployments',
          description: 'List deployments in a namespace',
          inputSchema: {
            type: 'object',
            properties: {
              namespace: {
                type: 'string',
                description: 'Kubernetes namespace (default: "default")',
              },
              labelSelector: {
                type: 'string',
                description: 'Label selector to filter deployments (e.g. "app=nginx")',
              },
            },
            required: [],
          },
        },
        {
          name: 'describe_pod',
          description: 'Get detailed information about a pod',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Pod name',
              },
              namespace: {
                type: 'string',
                description: 'Kubernetes namespace (default: "default")',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'describe_service',
          description: 'Get detailed information about a service',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Service name',
              },
              namespace: {
                type: 'string',
                description: 'Kubernetes namespace (default: "default")',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'describe_deployment',
          description: 'Get detailed information about a deployment',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Deployment name',
              },
              namespace: {
                type: 'string',
                description: 'Kubernetes namespace (default: "default")',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'get_pod_logs',
          description: 'Get logs from a pod',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Pod name',
              },
              namespace: {
                type: 'string',
                description: 'Kubernetes namespace (default: "default")',
              },
              container: {
                type: 'string',
                description: 'Container name (if pod has multiple containers)',
              },
              tailLines: {
                type: 'number',
                description: 'Number of lines to return from the end of the logs',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'list_namespaces',
          description: 'List all namespaces in the cluster',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'list_nodes',
          description: 'List all nodes in the cluster',
          inputSchema: {
            type: 'object',
            properties: {
              labelSelector: {
                type: 'string',
                description: 'Label selector to filter nodes (e.g. "kubernetes.io/role=master")',
              },
            },
            required: [],
          },
        },
        {
          name: 'describe_node',
          description: 'Get detailed information about a node',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Node name',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'list_configmaps',
          description: 'List configmaps in a namespace',
          inputSchema: {
            type: 'object',
            properties: {
              namespace: {
                type: 'string',
                description: 'Kubernetes namespace (default: "default")',
              },
              labelSelector: {
                type: 'string',
                description: 'Label selector to filter configmaps',
              },
            },
            required: [],
          },
        },
        {
          name: 'describe_configmap',
          description: 'Get detailed information about a configmap',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'ConfigMap name',
              },
              namespace: {
                type: 'string',
                description: 'Kubernetes namespace (default: "default")',
              },
            },
            required: ['name'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'get_cluster_info':
            return await this.getClusterInfo();
          case 'list_pods':
            return await this.listPods(request.params.arguments);
          case 'list_services':
            return await this.listServices(request.params.arguments);
          case 'list_deployments':
            return await this.listDeployments(request.params.arguments);
          case 'describe_pod':
            return await this.describePod(request.params.arguments);
          case 'describe_service':
            return await this.describeService(request.params.arguments);
          case 'describe_deployment':
            return await this.describeDeployment(request.params.arguments);
          case 'get_pod_logs':
            return await this.getPodLogs(request.params.arguments);
          case 'list_namespaces':
            return await this.listNamespaces();
          case 'list_nodes':
            return await this.listNodes(request.params.arguments);
          case 'describe_node':
            return await this.describeNode(request.params.arguments);
          case 'list_configmaps':
            return await this.listConfigMaps(request.params.arguments);
          case 'describe_configmap':
            return await this.describeConfigMap(request.params.arguments);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        console.error(`Error executing tool ${request.params.name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async getClusterInfo() {
    try {
      // Get version info from the Kubernetes API
      const versionInfo = await this.k8sApi.core.getAPIResources();
      const currentContext = this.kc.getCurrentContext();
      const cluster = this.kc.getCluster(currentContext);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              currentContext,
              clusterInfo: cluster,
              apiResources: versionInfo.resources,
              groupVersion: versionInfo.groupVersion,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Error getting cluster info:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error getting cluster info: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async listPods(args: any) {
    try {
      // Ensure namespace is always provided
      const namespace = args?.namespace || 'default';
      console.error('Listing pods in namespace:', namespace);
      
      // Check if the cluster is accessible
      try {
        // Using the older version of the client library
        const response = await this.k8sApi.core.listNamespacedPod(namespace);
        
        // Log the response structure for debugging
        console.error('Pod response structure:', Object.keys(response));
        
        // Extract pods from the response
        const items = response.body?.items || [];
        
        const pods = items.map((pod: any) => ({
          name: pod.metadata?.name,
          namespace: pod.metadata?.namespace,
          status: pod.status?.phase,
          ip: pod.status?.podIP,
          node: pod.spec?.nodeName,
          creationTimestamp: pod.metadata?.creationTimestamp,
        }));
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(pods, null, 2),
            },
          ],
        };
      } catch (connectionError) {
        // If there's a connection error, provide a more informative message
        console.error('Connection error:', connectionError);
        
        // Get the current context and cluster info
        const currentContext = this.kc.getCurrentContext();
        const cluster = this.kc.getCluster(currentContext);
        
        return {
          content: [
            {
              type: 'text',
              text: `Unable to connect to the Kubernetes cluster at ${cluster?.server}.\n\nThis could be due to one of the following reasons:\n1. The cluster is not running or accessible from this environment\n2. The kubeconfig file is pointing to a cluster that's not available\n3. The cluster requires a proxy or VPN connection\n4. There might be network issues preventing the connection\n\nPlease check your Kubernetes configuration and network connectivity.`,
            },
          ],
          isError: true,
        };
      }
    } catch (error) {
      console.error('Error listing pods:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error listing pods: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async listServices(args: any) {
    const namespace = args?.namespace || 'default';
    const labelSelector = args?.labelSelector;
    
    try {
      // @ts-ignore - Ignore TypeScript errors for the Kubernetes client API
      const response = await this.k8sApi.core.listNamespacedService(
        namespace,
        undefined,
        labelSelector
      );
      
      const services = (response as any).body.items.map((service: any) => ({
        name: service.metadata?.name,
        namespace: service.metadata?.namespace,
        type: service.spec?.type,
        clusterIP: service.spec?.clusterIP,
        ports: service.spec?.ports,
        selector: service.spec?.selector,
        creationTimestamp: service.metadata?.creationTimestamp,
      }));
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(services, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Error listing services:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error listing services: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async listDeployments(args: any) {
    const namespace = args?.namespace || 'default';
    const labelSelector = args?.labelSelector;
    
    try {
      // @ts-ignore - Ignore TypeScript errors for the Kubernetes client API
      const response = await this.k8sApi.apps.listNamespacedDeployment(
        namespace,
        undefined,
        labelSelector
      );
      
      const deployments = (response as any).body.items.map((deployment: any) => ({
        name: deployment.metadata?.name,
        namespace: deployment.metadata?.namespace,
        replicas: {
          desired: deployment.spec?.replicas,
          available: deployment.status?.availableReplicas,
          ready: deployment.status?.readyReplicas,
        },
        selector: deployment.spec?.selector,
        creationTimestamp: deployment.metadata?.creationTimestamp,
      }));
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(deployments, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Error listing deployments:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error listing deployments: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async describePod(args: any) {
    if (!args?.name) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: Pod name is required',
          },
        ],
        isError: true,
      };
    }
    
    const namespace = args.namespace || 'default';
    
    try {
      const response = await this.k8sApi.core.readNamespacedPod(args.name, namespace);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify((response as any).body, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Error describing pod:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error describing pod: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async describeService(args: any) {
    if (!args?.name) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: Service name is required',
          },
        ],
        isError: true,
      };
    }
    
    const namespace = args.namespace || 'default';
    
    try {
      const response = await this.k8sApi.core.readNamespacedService(args.name, namespace);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify((response as any).body, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Error describing service:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error describing service: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async describeDeployment(args: any) {
    if (!args?.name) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: Deployment name is required',
          },
        ],
        isError: true,
      };
    }
    
    const namespace = args.namespace || 'default';
    
    try {
      const response = await this.k8sApi.apps.readNamespacedDeployment(args.name, namespace);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify((response as any).body, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Error describing deployment:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error describing deployment: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async getPodLogs(args: any) {
    if (!args?.name) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: Pod name is required',
          },
        ],
        isError: true,
      };
    }
    
    const namespace = args.namespace || 'default';
    const container = args.container;
    const tailLines = args.tailLines;
    
    try {
      const response = await this.k8sApi.core.readNamespacedPodLog(
        args.name,
        namespace,
        {
          container: container,
          tailLines: tailLines
        }
      );
      
      return {
        content: [
          {
            type: 'text',
            text: response,
          },
        ],
      };
    } catch (error) {
      console.error('Error getting pod logs:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error getting pod logs: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async listNamespaces() {
    try {
      const response = await this.k8sApi.core.listNamespace();
      
      // Log the response structure to help debug
      console.error('Namespace response:', JSON.stringify(response, null, 2));
      
      // Check if response has the expected structure
      if (!response) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: No response from Kubernetes API',
            },
          ],
          isError: true,
        };
      }
      
      // Try to access items from different possible response structures
      let items = [];
      if ((response as any).body && (response as any).body.items) {
        items = (response as any).body.items;
      } else if ((response as any).items) {
        items = (response as any).items;
      } else {
        // If we can't find items, return the raw response
        return {
          content: [
            {
              type: 'text',
              text: `Raw response: ${JSON.stringify(response, null, 2)}`,
            },
          ],
        };
      }
      
      const namespaces = items.map((ns: any) => ({
        name: ns.metadata?.name,
        status: ns.status?.phase,
        creationTimestamp: ns.metadata?.creationTimestamp,
      }));
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(namespaces, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Error listing namespaces:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error listing namespaces: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async listNodes(args: any) {
    const labelSelector = args?.labelSelector;
    
    try {
      // @ts-ignore - Ignore TypeScript errors for the Kubernetes client API
      const response = await this.k8sApi.core.listNode(
        undefined,
        labelSelector
      );
      
      const nodes = (response as any).body.items.map((node: any) => ({
        name: node.metadata?.name,
        status: node.status?.conditions?.find((c: any) => c.type === 'Ready')?.status === 'True' ? 'Ready' : 'NotReady',
        roles: Object.entries(node.metadata?.labels || {})
          .filter(([key]) => key.startsWith('node-role.kubernetes.io/'))
          .map(([key]) => key.replace('node-role.kubernetes.io/', '')),
        version: node.status?.nodeInfo?.kubeletVersion,
        osImage: node.status?.nodeInfo?.osImage,
        kernelVersion: node.status?.nodeInfo?.kernelVersion,
        creationTimestamp: node.metadata?.creationTimestamp,
      }));
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(nodes, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Error listing nodes:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error listing nodes: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async describeNode(args: any) {
    if (!args?.name) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: Node name is required',
          },
        ],
        isError: true,
      };
    }
    
    try {
      const response = await this.k8sApi.core.readNode(args.name);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify((response as any).body, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Error describing node:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error describing node: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async listConfigMaps(args: any) {
    const namespace = args?.namespace || 'default';
    const labelSelector = args?.labelSelector;
    
    try {
      // @ts-ignore - Ignore TypeScript errors for the Kubernetes client API
      const response = await this.k8sApi.core.listNamespacedConfigMap(
        namespace,
        undefined,
        labelSelector
      );
      
      const configMaps = (response as any).body.items.map((cm: any) => ({
        name: cm.metadata?.name,
        namespace: cm.metadata?.namespace,
        dataKeys: Object.keys(cm.data || {}),
        creationTimestamp: cm.metadata?.creationTimestamp,
      }));
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(configMaps, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Error listing configmaps:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error listing configmaps: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async describeConfigMap(args: any) {
    if (!args?.name) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: ConfigMap name is required',
          },
        ],
        isError: true,
      };
    }
    
    const namespace = args.namespace || 'default';
    
    try {
      const response = await this.k8sApi.core.readNamespacedConfigMap(args.name, namespace);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify((response as any).body, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Error describing configmap:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error describing configmap: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Kubernetes MCP server running on stdio');
  }
}

const server = new KubernetesServer();
server.run().catch(console.error);
