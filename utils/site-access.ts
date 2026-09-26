import {useEffect, useState} from "react";
import {Storage} from "@plasmohq/storage";

/** Hostnames where BrainyAI shows nothing on the page. Key kept from the old "Disable for this site" option. */
export const DISABLED_SITES_KEY = 'CloseHostNamesData';
/** When true, BrainyAI shows nothing on any page. */
export const DISABLED_ALL_SITES_KEY = 'DisabledOnAllSites';

const storage = new Storage();

export interface SiteAccess {
    /** False until the settings have been read, so nothing flashes on a disabled site. */
    loaded: boolean;
    disabledSites: string[];
    disabledAllSites: boolean;
}

export function isSiteDisabled(access: SiteAccess, hostname: string): boolean {
    return access.disabledAllSites || access.disabledSites.includes(hostname);
}

export async function disableSite(hostname: string) {
    const sites = (await storage.get<string[]>(DISABLED_SITES_KEY)) ?? [];
    if (!sites.includes(hostname)) {
        await storage.set(DISABLED_SITES_KEY, [...sites, hostname]);
    }
}

export async function enableSite(hostname: string) {
    const sites = (await storage.get<string[]>(DISABLED_SITES_KEY)) ?? [];
    await storage.set(DISABLED_SITES_KEY, sites.filter(site => site !== hostname));
}

export async function setDisabledAllSites(disabled: boolean) {
    await storage.set(DISABLED_ALL_SITES_KEY, disabled);
}

/** Current site access settings, kept in sync with changes made in other tabs or the options page. */
export function useSiteAccess(): SiteAccess {
    const [access, setAccess] = useState<SiteAccess>({loaded: false, disabledSites: [], disabledAllSites: false});

    useEffect(() => {
        let active = true;
        const load = async () => {
            const [sites, all] = await Promise.all([
                storage.get<string[]>(DISABLED_SITES_KEY),
                storage.get<boolean>(DISABLED_ALL_SITES_KEY),
            ]);
            if (active) {
                setAccess({loaded: true, disabledSites: sites ?? [], disabledAllSites: !!all});
            }
        };

        void load();
        const watchers = {[DISABLED_SITES_KEY]: load, [DISABLED_ALL_SITES_KEY]: load};
        storage.watch(watchers);
        return () => {
            active = false;
            storage.unwatch(watchers);
        };
    }, []);

    return access;
}
