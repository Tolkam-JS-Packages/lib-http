import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { urlencode } from '@tolkam/lib-utils';

const errorTypes = {
    response: 'response' as const,
    request: 'request' as const,
    cancel: 'cancel' as const,
    unknown: 'unknown' as const,
};

class Http {

    /**
     * Error listeners
     */
    private errorListeners: IErrorListener[] = [];

    /**
     * @type IRequestConfig
     */
    private client: AxiosInstance;

    /**
     * @param config IRequestConfig
     */
    public constructor(config: IRequestConfig) {
        this.client = axios.create(config);
    }

    /**
     * Performs the request
     *
     * @param config
     * @param onProgress
     */
    public request<T>(
        config: IRequestConfig,
        onProgress?: IProgressListener
    ): [Promise<IResponse<T>>, Function] {

        const that = this;
        let cancelFn: Function = () => {};

        config.cancelToken = new axios.CancelToken(cancel => cancelFn = cancel);

        if(!config.paramsSerializer) {
            config.paramsSerializer = that.urlEncode;
        }

        if(!config.transformRequest) {
            config.transformRequest = that.convertToFormData;
        }

        if(onProgress) {
            config.onDownloadProgress = config.onUploadProgress = (e) => {
                that.normalizeProgress(e, onProgress);
            }
        }

        const promise = that.client.request<T>(config);

        // add global error handler
        promise.catch(that.onError);

        return [
            promise,
            cancelFn
        ];
    }

    /**
     * Adds error listener
     *
     * @param listener
     *
     * returns {Function}
     */
    public addErrorListener(listener: IErrorListener) {
        const errorListeners = this.errorListeners;
        const count = errorListeners.push(listener);

        // unsubscribe fn
        return (): void => {
            errorListeners.splice(count-1, 1);
        };
    }

    /**
     * Checks if value is Cancel
     *
     * @param value
     *
     * returns {boolean}
     */
    public isCancel(value: unknown): boolean {
        return axios.isCancel(value);
    }

    /**
     * Checks if value is a http client error
     *
     * @param value
     */
    public isOwnError(value: unknown) {
        return (value as IError).isAxiosError || this.isCancel(value);
    }

    /**
     * Handles request errors
     *
     * @param error
     *
     * @returns {void}
     */
    protected onError = (error: any) => {
        let errorType: any = errorTypes.unknown;

        if(this.isCancel(error)) {
            errorType = errorTypes.cancel;
        } else if(error.response) {
            errorType = errorTypes.response;
        } else if(error.request) {
            errorType = errorTypes.request;
        }

        for(const listener of this.errorListeners) {
            listener(error, errorType);
        }
    };

    /**
     * Encodes query into php-style string
     *
     * @param query
     *
     * @returns {string}
     */
    protected urlEncode(query: object): string {
        return urlencode(query);
    }

    /**
     * Converts object to FormData
     *
     * @param data
     * @param headers
     *
     * @returns {FormData}
     */
    protected convertToFormData(
        data: object,
        headers: IRequestConfig['headers']
    ): FormData {
        const formData = new FormData();

        for (const name in data) {
            const value = data[name];
            if (value instanceof FileList || Array.isArray(value)) {
                for (let i = 0; i < value.length; i++) {
                    formData.append(name + '[]', value[i]);
                }
            } else {
                formData.set(name, value);
            }
        }

        return formData;
    }

    /**
     * Normalizes progress event to 0-100 range
     *
     * @param e
     * @param cb
     *
     * @returns {void}
     */
    protected normalizeProgress(e: ProgressEvent, cb: (progress: number) => void): void {
        if (e.lengthComputable) {
            cb(Math.round((e.loaded / e.total)*100));
        }
    }
}

/**
 * Introduce own interfaces for consumers
 */
interface IRequestConfig extends AxiosRequestConfig {}

interface IResponse<T = any> extends AxiosResponse<T> {
    config: IRequestConfig;
    request?: XMLHttpRequest;
}

interface IError<T = any> extends AxiosError<T> {
    config: IRequestConfig;
    request?: XMLHttpRequest;
    response?: IResponse<T>;
}

/**
 * Error types
 *
 * response - server responded with error code
 * request - error during request, ex. network error
 * cancel - request cancelled
 * unknown - any other error
 */
type TErrorType =
    typeof errorTypes.response
    | typeof errorTypes.request
    | typeof errorTypes.cancel
    | typeof errorTypes.unknown;

interface IErrorListener {
    (error: any, type: TErrorType): void;
}

interface IProgressListener {
    (percentage: number): void;
}

interface IHttp extends Http {}

export default Http;
export { IHttp, errorTypes, IRequestConfig, IResponse, IError }
