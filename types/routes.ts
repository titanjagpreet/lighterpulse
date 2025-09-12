/**
 * Type definitions for route parameters
 */

export interface DashboardParams {
  address: string;
}

export interface ExplorerParams {
  txnhash: string;
}

export interface BlockParams {
  blockno: string;
}

export interface PageProps<T = {}> {
  params: Promise<T>;
  searchParams?: { [key: string]: string | string[] | undefined };
}